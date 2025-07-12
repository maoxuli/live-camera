#!/usr/bin/env python 

import os 
import time 
import json 
import asyncio
import threading
import subprocess

import logging
logger = logging.getLogger(__name__)

# Only one instance is allowed for each server, including video server, 
# web server, and websocket server.  
def singleton(cls):
    instances = {}
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper

# There are three types of images will be send to client side, including 
# frames of video stream, snapshot image, and a static image showing when  
# video stream and snapshot is not ready or in error state. We use three 
# buffers to manage the images, which have same interface. 
 
import io
from PIL import Image

# When camera is not ready or in error state, we will show a "logo" image.  
class LogoBuffer(io.BufferedIOBase): 
    def __init__(self, image_file = None): 
        self._frame = None 
        if image_file: 
            logger.info(f"Load logo image from {image_file}")
            with open(image_file, "rb") as f: 
                self._frame = f.read()
        else: 
            logger.info(f"Create dummy logo image")
            buf = io.BytesIO()
            image = Image.new("RGB", (1280, 720), (0, 0, 0)) 
            image.save(buf, format='jpeg') 
            self._frame = buf.getvalue() 
        logger.info(f"Logo image size: {len(self._frame)}")

    def read(self): 
        return self._frame 

# Snapshot "write" image which is read by web server. 
class FrameBuffer(io.BufferedIOBase): 
    def __init__(self): 
        self._frame = None 

    def write(self, buf): 
        self._frame = buf 

    def read(self): 
        return self._frame 
        
# video stream is supposed to "write" and "read" in a loop. 
class StreamBuffer(io.BufferedIOBase):
    def __init__(self):
        self._condition = threading.Condition()
        self._frame = None 
        self._last_write_t = time.time()
        self._last_read_t = time.time()

    def write(self, buf):
        with self._condition:
            if time.time() - self._last_write_t > 0.05: # lower than 20 fps 
                logger.warning(f"write after: {time.time() - self._last_write_t}")
            self._last_write_t = time.time()
            self._frame = buf
            self._condition.notify_all()

    def read(self): 
        with self._condition:
            if time.time() - self._last_read_t > 0.1: # lower than 10 fps 
                logger.warning(f"read after: {time.time() - self._last_read_t}")
            self._last_read_t = time.time()
            return self._frame if self._condition.wait(1) else None 

# VideoServer works with one camera sensor, to manage the video streaming and snapshot. 
# The parmaters of the camera/video is passed in with a config file. 

from picamera2 import Picamera2
from picamera2.encoders import JpegEncoder
from picamera2.outputs import FileOutput
import libcamera

@singleton 
class VideoServer(object): 
    def __init__(self, config_file = None):
        # config 
        self._config_file = config_file 
        self._config = None 
        self.load_config() 
        assert(self._config is not None)

        # logo  
        logo_file = None 
        if "logo_file" in self._config: 
            logo_file = self._config["logo_file"] 
        logger.info(f"{logo_file=}")
        self._logo_buffer = LogoBuffer(logo_file) 

        # stream  
        self.picam2 = Picamera2()
        self._stream_buffer = StreamBuffer()
        self._stream_config = None 
        self.config_stream() 

        # snapshot  
        self._snapshot_buffer = FrameBuffer() 
        self._snapshot_config = None 
        self.config_snapshot() 

    def load_config(self): 
        # default config
        self._config = {
            "resolution": (1280, 720), 
            "frame_rate": 30, 
            "af_mode": 0, 
        }
        logger.info(f"Default video config: {self._config}")
        # overwrite with config file 
        if self._config_file: 
            logger.info(f"Load video config from {self._config_file}")
            with open(self._config_file) as f: 
                self._config.update(json.load(f)) 
                logger.info(f"Updated video config: {self._config}")

    def save_config(self): 
        if self._config_file: 
            logger.info(f"Save video config to {self._config_file}")
            with open(self._config_file, "w") as f: 
                json.dump(self._config, f, indent = 4)

    def config_stream(self): 
        try: 
            logger.info("Config for video streaming")
            resolution = self._config["resolution"] 
            logger.info(f"{resolution=}")
            self._stream_config = self.picam2.create_video_configuration(main={"size": resolution})
            self.picam2.configure(self._stream_config)
            self.picam2.set_controls({"AfMode": libcamera.controls.AfModeEnum.Continuous})
        except Exception as e: 
            logger.warning(f"Failed config video streaming: {e}")

    def config_snapshot(self): 
        pass 

    def get_param(self, name): 
        logger.info(f"Get video param {name}")
        if name in self._config: 
            return self._config[name] 
        
    def set_param(self, name, value): 
        logger.info(f"Set video param {name} to {value}")
        self._config[name] = value 

    @property
    def config(self): 
        return self._config 
    
    @config.setter 
    def config(self): 
        pass 

    @property
    def logo(self): 
        return self._logo_buffer

    @property
    def stream(self): 
        return self._stream_buffer  
    
    @property
    def snapshot(self): 
        logger.info("snapshot") 
        try: 
            _data = io.BytesIO() 
            self.picam2.capture_file(_data, format="jpeg")
            logger.info(f"Image size: {len(_data.getvalue())}")
            self._snapshot_buffer.write(_data.getvalue()) 
        except Exception as e: 
            logger.warning(f"Failed capture image: {e}")
        return self._snapshot_buffer 
    
    def start(self): 
        logger.info("Start video streaming")
        try: 
            self.picam2.start_recording(JpegEncoder(), FileOutput(self._stream_buffer)) 
        except Exception as e: 
            logger.warning(f"Failed start video streaming: {e}") 

    def stop(self):  
        logger.info("Stop video streaming")
        try:
            self.picam2.stop_recording() 
            self.picam2.stop() 
            self.picam2.close() 
            logger.info("Video streaming stopped")
        except Exception as e: 
            logger.warning(f"Failed stop video streaming: {e}")

# Web server serves web pages, including the live video page, snapshot page, and admin page. 
# It also handle the request of video stream and snapshot image. 
            
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler 

@singleton 
class WebServer(object): 
    class HttpRequestHandler(SimpleHTTPRequestHandler): 
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs, directory="www")
    
        def do_GET(self):
            print(self.path)
            if self.path == "/stream.mjpg":
                self.send_response(200)
                self.send_header("Age", 0)
                self.send_header("Cache-Control", "no-cache, private")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=FRAME")
                self.end_headers()
                try:
                    video_server = VideoServer() 
                    while True: 
                        frame = video_server.stream.read()
                        if frame is None:
                            logger.warning("Failed capture frame")
                            frame = video_server.logo.read() 
                        self.wfile.write(b"--FRAME\r\n")
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Content-Length", len(frame))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b"\r\n")
                except Exception as e:
                    logger.warning(f"Error in stream: {e}") 
                    self.send_error(404)
            elif self.path == "/snapshot.jpg":
                self.send_response(200)
                self.send_header("Content-type", "image/jpeg")
                try: 
                    video_server = VideoServer() 
                    image = video_server.snapshot.read()
                    if image is None: 
                        logger.warning("Failed capture snapshot")
                        image = video_server.logo.read() 
                    self.send_header("Content-Length", len(image))
                    self.end_headers() 
                    self.wfile.write(image)
                except Exception as e:
                    logger.warning(f"Error in snapshot: {e}")
                    self.send_error(404)
            else:
                if self.path == "/": 
                    self.path = "/camera.html"
                return super().do_GET()

    def __init__(self, port = 8080): 
        self._port = port 
        self._httpd = ThreadingHTTPServer(("", self._port), self.HttpRequestHandler) 
        self._thread = None 

    @property 
    def port(self): 
        return self._port  

    def start(self): 
        if self._thread is None: 
            logger.info(f"Start web server at port {self.port}") 
            self._thread = threading.Thread(target=self._httpd.serve_forever)
            self._thread.start()

    def stop(self): 
        if self._thread is not None: 
            logger.warning("Stop web server...")
            self._httpd.shutdown()
            self._thread.join()
            self._thread = None 
            logger.warning("Web server stopped")
        
# Websocket server is used for bi-directional communications between camera and web pages.  
import websockets
import netifaces

def run_bash_script(command_args): 
    print(f"{command_args=}")
    result = subprocess.run(command_args, capture_output=True, text=True) 
    print("stdout---")
    print(result.stdout)
    print("stderr---")
    print(result.stderr) 
    print(f"returncode: {result.returncode }")
    return result.returncode 

def get_network_addr(interface): 
    print("check interface addresses")
    addresses = netifaces.ifaddresses(interface)
    print("stdout---")
    print(addresses)
    if netifaces.AF_INET in addresses:
        ipv4_addresses = addresses[netifaces.AF_INET]
        if len(ipv4_addresses) > 0: 
            return ipv4_addresses[0]

def find_key_value(filename, key): 
    print(f"find {key} in {filename}")
    with open(filename) as f:
        for line in f: 
            print(line)
            parts = line.split("=") 
            if len(parts) > 1 and key == parts[0].strip(): 
                value = parts[1].strip().strip('\"') 
                return value  

def get_wifi_sta_id(): 
    wpa_conf = "/etc/wpa_supplicant/wpa_supplicant.conf"
    print(f"get wifi ssid and password from {wpa_conf}")
    ssid = find_key_value(wpa_conf, "ssid") 
    password = find_key_value(wpa_conf, "psk") 
    print(f"{ssid=}")
    print(f"{password=}")
    return ssid, password 

def get_wifi_ap_id(): 
    apd_conf = "/etc/hostapd/hostapd.conf"
    print(f"get wifi ssid and password from {apd_conf}")
    ssid = find_key_value(apd_conf, "ssid") 
    password = find_key_value(apd_conf, "wpa_passphrase") 
    print(f"{ssid=}")
    print(f"{password=}")
    return ssid, password 

# handle requests on websocket connection 
# JSON-RPC 2.0 protocol 
class WebsocketConnection(object): 
    def __init__(self, websocket): 
        # websocket 
        self._websocket = websocket 

        # supported reqeusts 
        self._handlers = {
            "check_system_status": self.check_system_status, 
            "restart_system": self.restart_system, 
            "shutdown_system": self.shutdown_system, 
            "check_software_versions": self.check_software_versions, 
            "install_software": self.install_software, 
            "check_wifi_ap_status": self.check_wifi_ap_status, 
            "setup_wifi_ap": self.setup_wifi_ap, 
            "check_wifi_sta_status": self.check_wifi_sta_status, 
            "setup_wifi_sta": self.setup_wifi_sta, 
            "check_video_settings": self.check_video_settings, 
            "setup_video": self.setup_video, 
            "setup_video_resolution": self.setup_video_resolution, 
            "setup_video_fps": self.setup_video_fps, 
        } 

        # paths 
        self.camera_dir = os.path.dirname(os.path.abspath(__file__)) 
        self.system_dir = os.path.dirname(self.camera_dir) 
        self.updates_dir = os.path.join(self.system_dir, "updates") 
        self.network_dir = os.path.join(self.system_dir, "network") 
        logger.info(f"{self.camera_dir=}")
        logger.info(f"{self.system_dir=}") 
        logger.info(f"{self.updates_dir=}") 
        logger.info(f"{self.network_dir=}") 

    # send back a message to client 
    async def send_response(self, response): 
        logger.info(f"Send response: {response}")
        message = json.dumps(response)  
        await self._websocket.send(message)

    async def send_error_status(self, code = -1, message = "", id = None): 
        logger.info(f"Send error status: {code} {message}")
        await self.send_response({ "error": { "code": code, "message": message}, "id": id }) 

    # handle requests until the connection is closed  
    async def handle_requests(self): 
        try: 
            async for message in self._websocket: 
                try: 
                    request = json.loads(message) 
                    logger.info(f"received request: {request}")
                    await self.handle_request(request)
                except websockets.exceptions.ConnectionClosed: 
                    raise 
                except Exception as e: 
                    logger.warning(f"Error while handling request: {e}")
        except websockets.exceptions.ConnectionClosed:
            raise 
        except Exception as e: 
            logger.error(f"Error while handling requests: {e}")

    async def handle_request(self, request): 
        assert(isinstance(request, dict))
        method = request["method"] if "method" in request else None 
        params = request["params"] if "params" in request else None 
        id = request["id"] if "id" in request else None 
        logger.info(f"{method=}")
        logger.info(f"{params=}") 
        logger.info(f"{id=}") 
        if method in self._handlers: 
            await self._handlers[method](params=params, id=id) 
        else: 
            logger.warning(f"Method not in list: {self._handlers.keys()}") 
            await self.send_error_status(-1, "Unsupported method", id)

    async def check_system_status(self, params = None, id = None): 
        logger.info("check_system_status") 
        await self.send_error_status(-1, "Not implemented", id) 

    async def restart_system(self, params = None, id = None): 
        logger.warning("restart_system")
        try: 
            code = run_bash_script(["sudo", "shutdown", "-r", "now"]) 
            message = (
                "Successfully restart the system" if code == 0 
                else "Failed to restart the system"
            ) 
            await self.send_error_status(code, message, id) 
        except Exception as e: 
            logger.warning(f"Error restart system: {e}") 
            await self.send_error_status(-1, "Error to restart system", id)

    async def shutdown_system(self, params = None, id = None): 
        logger.warning("shutdown_system")
        try: 
            code = run_bash_script(["sudo", "shutdown", "-h", "now"])  
            message = (
                "Successfully shutdown the system" if code == 0 
                else "Failed to shutdown the system"
            ) 
            await self.send_error_status(code, message, id)
        except Exception as e: 
            logger.warning(f"Error shutdown system: {e}") 
            await self.send_error_status(-1, "Error to shutdown system", id)
   
    async def check_software_versions(self, params = None, id = None): 
        logger.info("check_software_versions")
        try: 
            code = run_bash_script([os.path.join(self.updates_dir, "updates.sh"), "check"])
            if code != 0: 
                logger.warning("Failed checking software updates")
                await self.send_error_status(-1, "Failed checking software updates", id)
        except Exception as e: 
            logger.warning(f"Error to check software updates: {e}") 
            await self.send_error_status(-1, "Error to check software updates", id) 

        # get current versions 
        installed_version = None 
        latest_version = None 
        fallback_version = None 

        try: 
            version_file = os.path.join(self.system_dir, "VERSION.txt")
            logger.info(f"Check installed version from {version_file}")
            with open(version_file) as f: 
                for line in f: 
                    logger.info(f"{line=}")
                    key, value = line.split("=") 
                    if key == "CURRENT_VERSION": 
                        installed_version = value 
                        break 
        except Exception as e: 
            logger.warning(f"Error check installed version: {e}")
            await self.send_error_status(-1, "Error to check installed version", id)

        try: 
            version_file = os.path.join(self.system_dir, "VERSION.txt")
            logger.info(f"Check latest and fallback version from {version_file}")
            with open(os.path.join(self.updates_dir, "VERSION.txt")) as f: 
                for line in f: 
                    logger.info(f"{line=}")
                    key, value = line.split("=") 
                    if key == "CURRENT_VERSION": 
                        latest_version = value 
                    elif key == "FALLBACK_VERSION": 
                        fallback_version = value 
        except Exception as e: 
            logger.warning(f"Error check updated versions: {e}")
            await self.send_error_status(-1, "Error to check updated versions", id)    

        logger.info(f"{installed_version=}")
        logger.info(f"{latest_version=}")
        logger.info(f"{fallback_version=}")

        response =  {
            "result": {
                "installed_version": installed_version, 
                "latest_version": latest_version, 
                "fallback_version": fallback_version,
            },
            "id": id,
        } 
        await self.send_response(response) 
    
    async def install_software(self, params = None, id = None): 
        version = params["version"] if "version" in params else None 
        logger.warning(f"Install software version {version}")
        if version: 
            try: 
                code = run_bash_script([os.path.join(self.updates_dir, "updates.sh"), "install", version])
                message = (
                    f"Successfully installed software version {version}" if code == 0 
                    else f"Failed installing software version {version}"
                ) 
                await self.send_error_status(code, message, id) 
            except Exception as e: 
                logger.warning(f"Error install software version: {e}") 
                await self.send_error_status(-1, f"Error to install software version {version}", id)
        else: 
            await self.send_error_status(-1, "Software version is not set", id)

    async def check_wifi_ap_status(self, params = None, id = None): 
        try: 
            logger.info("check_wifi_ap_status")
            ssid, password = get_wifi_ap_id() 
            logger.info(f"{ssid=}") 
            logger.info(f"{password=}")
            if ssid is None: 
                await self.send_error_status(0, "WiFi AP is not setup", id) 
        except Exception as e: 
            logger.warning(f"Error checking wifi ap: {e}")
            await self.send_error_status(-1, "Error to check WiFi AP", id)  
            
        try: 
            address = get_network_addr("uap0")
            if address is None: 
                await self.send_error_status(-1, "Failed checking WiFi IP. WiFi is not connected." , id) 
        except Exception as e: 
            logger.waning(f"Error checking wifi ip: {e}") 
            await self.send_error_status(-1, "Error to check WiFi IP", id)
            
        response = {
            "result": {
                "setup": { "ssid": ssid, "password": password }, 
                "address": address
            }, 
            "id": id,
        }
        await self.send_response(response)

    async def setup_wifi_ap(self, params = None, id = None): 
        logger.info(f"setup_wifi_ap: {params}") 
        await self.send_error_status(-1, "Not implemented", id)

    async def check_wifi_sta_status(self, params = None, id = None): 
        try: 
            logger.info("check_wifi_sta_status")
            ssid, password = get_wifi_sta_id() 
            if ssid is None: 
                await self.send_error_status(0, "WiFi STA is not setup", id) 
        except Exception as e: 
            logger.warning(f"Error checking wifi sta: {e}")
            await self.send_error_status(-1, "Error to check WiFi STA", id)  
        
        try: 
            address = get_network_addr("wlan0")
            if address is None: 
                await self.send_error_status(-1, "Failed checking WiFi IP. WiFi is not connected." , id)
        except Exception as e: 
            logger.waning(f"Error checking wifi ip: {e}") 
            await self.send_error_status(-1, "Error to check WiFi IP", id)
            
        response = {
            "result": {
                "setup": { "ssid": ssid, "password": password }, 
                "address": address
            }, 
            "id": id,
        }
        await self.send_response(response)

    async def setup_wifi_sta(self, params = None, id = None): 
        logger.info(f"setup_wifi_sta: {params}") 
        if "ssid" not in params: 
            await self.send_error_status(-1, "SSID is not set for WiFi STA", id) 
        else:  
            ssid = params["ssid"] 
            password = params["password"] if "password" in params else None 
            try: 
                logger.info("check current SSID and password")
                current_ssid, current_password = get_wifi_sta_id() 
                if ssid == current_ssid and password == current_password: 
                    await self.send_error_status(0, "No change for WiFi STA", id)
                    return 
            except Exception as e: 
                logger.waning(f"Error to check wifi sta: {e}")

            try: 
                logger.info(f"Setup WiFi STA: {ssid} {password}") 
                code = run_bash_script([os.path.join(self.network_dir, "setup-wifi-sta.sh"), ssid, password])
                message = (
                    "Succeffully set SSID and password for WiFi STA" if code == 0 
                    else "Failed setting SSID and password for WiFi STA"
                )
                await self.send_error_status(code, message, id) 
            except Exception as e: 
                logger.warning(f"Error to set wifi sta: {e}") 
                await self.send_error_status(-1, "Error to set WiFi STA", id) 

            if code == 0: 
                logger.info("restart network") 
                await self.send_error_status(0, "Network restart, please wait for a while.", id) 
                try: 
                    code = run_bash_script([os.path.join(self.network_dir, "restart-wifi.sh")])
                    message = (
                        "Succeffully restart WiFi network" if code == 0 
                        else "Failed to restart WiFi network"
                    )
                    await self.send_error_status(code, message, id) 
                except Exception as e: 
                    await self.send_error_status(-1, "Error to restart WiFi network", id)

    async def check_video_settings(self, params = None, id = None): 
        pass 

    async def setup_video(self, params = None, id = None): 
        pass 

    async def setup_video_resolution(self, params = None, id = None): 
        pass 

    async def setup_video_fps(self, params = None, id = None): 
        pass 


@singleton
class WebsocketServer(object): 
    def __init__(self, port = 8090): 
        self.port = port 
        self._connections = set() 
        self._server = None
        self._stop_event = None  
        self._loop = None 
        self._thread = None 

    # handle client connection
    async def handler(self, websocket):
        logger.info(f"Income connection from {websocket.remote_address[0]}") 
        connection = WebsocketConnection(websocket)
        self._connections.add(connection)
        try:
            await connection.handle_requests() 
            await websocket.wait_closed()
        except websockets.exceptions.ConnectionClosed as e: 
            logger.warning(e)
        except Exception as e: 
            logger.warning(e)
        finally: 
            logger.error(f"Remove connection from {websocket.remote_address[0]}")
            self._connections.remove(connection)
            
    def run_forever(self):
        async def _run(): 
            logger.info(f"Run webocket server at port {self.port}") 
            self._loop = asyncio.get_running_loop() 
            self._stop_event = asyncio.Event() 
            self._server = await websockets.serve(self.handler, "0.0.0.0", self.port)
            await self._stop_event.wait()
            await self._server.wait_closed() 
        asyncio.run(_run())

    def start(self): 
        if self._thread is None: 
            logger.info(f"Start webocket server") 
            self._thread = threading.Thread(target=self.run_forever)
            self._thread.start()
    
    def stop(self): 
        if self._thread is not None: 
            logger.warning("Stop websocket server...")
            self._loop.call_soon_threadsafe(self._stop_event.set)
            self._loop.call_soon_threadsafe(self._server.close)
            self._thread.join()
            self._thread = None 
            self._connections.clear() 
            logger.warning("Websocket server stopped")

# start camera server(s) based on config file 
import signal 

def handle_signal(signum, frame):
    logger.warning("Kill signal received")

def main(config_file = None): 
    # default config 
    config = {
        "ws_port": 8090, 
        "http_port": 8080, 
        "video_config": "video.json", 
    }
    logger.info(f"Default camera config: {config}")

    # overwrite with config file 
    if config_file: 
        logger.info(f"Load camera config from {config_file}")
        with open(config_file) as f: 
            config.update(json.load(f))
            logger.info(f"Updated camera config: {config}")

    # run video stream server 
    video_config = config["video_config"] 
    logger.info(f"{video_config=}") 
    video_server = VideoServer(video_config) 
    video_server.start() 

    # run websocket server 
    ws_port = config["ws_port"] 
    logger.info(f"{ws_port=}")
    ws_server = WebsocketServer(ws_port)
    ws_server.start() 

    # run web server 
    http_port = config["http_port"]
    logger.info(f"{http_port=}") 
    web_server = WebServer(http_port)
    web_server.start() 

    try: 
        signal.signal(signal.SIGINT, handle_signal) 
        signal.pause() 
    except Exception as e:
        logger.error(f"Error: {e}")
    finally: 
        web_server.stop() 
        ws_server.stop() 
        video_server.stop() 

import argparse
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live Camera System")
    parser.add_argument("--config_file", "-c", type=str, default="camera.json")
    parser.add_argument("--log_level", type=str, default="INFO")

    # parser.print_help()
    args = parser.parse_args()
    logging.basicConfig(level=args.log_level, format="%(asctime)s - %(levelname)s - %(message)s")
    logger.info(vars(args))

    # start camera server with config file   
    main(args.config_file)
