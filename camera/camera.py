#!/usr/bin/env python 

import os 
import json
import time 
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
    def __init__(self, logo_file = None): 
        self._frame = None 
        if logo_file: 
            logger.info(f"Load logo image from {logo_file}")
            with open(logo_file, "rb") as f: 
                self._frame = f.read()
        else: 
            logger.info(f"Create dummy logo image")
            buf = io.BytesIO()
            image = Image.new("RGB", (1280, 720), (0, 0, 0)) 
            image.save(buf, format='jpeg') 
            self._frame = buf.getvalue() 
        logger.debug(f"Logo image size: {len(self._frame)}")

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
            if time.time() - self._last_write_t > 0.2: # lower than 5 fps 
                logger.warning(f"write after: {time.time() - self._last_write_t}")
            self._last_write_t = time.time()
            self._frame = buf
            self._condition.notify_all()

    def read(self): 
        with self._condition:
            if time.time() - self._last_read_t > 0.2: # lower than 5 fps 
                logger.warning(f"read after: {time.time() - self._last_read_t}")
            self._last_read_t = time.time()
            return self._frame if self._condition.wait(1) else None 

# VideoServer works with one camera sensor, 
# to manage the video streaming and snapshot. 

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput
from libcamera import Transform

from video_config import VideoConfig 

@singleton 
class VideoServer(object): 
    def __init__(self, config_file = "video_config.json"):
        # config manager 
        self._config = VideoConfig(config_file) 

        # logo  
        logo_file = "logo.jpg" 
        logger.debug(f"{logo_file=}")
        self._logo_buffer = LogoBuffer(logo_file) 

        # stream and snapshot 
        self._stream_buffer = StreamBuffer()
        self._snapshot_buffer = FrameBuffer() 
        self.picam2 = None 

    def open_camera(self): 
        logger.info("Open camera with initial setup") 
        transform = self._config.transform() 
        logger.info(f"{transform=}")
        frame_rate = self._config.frame_rate() 
        logger.info(f"{frame_rate=}")
        resolution = self._config.resolution() 
        logger.info(f"{resolution=}")
        snapshot_resolution = self._config.snapshot_resolution() 
        logger.info(f"{snapshot_resolution=}")

        self.picam2 = Picamera2() 
        video_config = self.picam2.create_video_configuration(
            main = {"size": snapshot_resolution, "format": "RGB888"},
            lores = {"size": resolution},  
            encode = "lores",
            buffer_count = 2, 
            display = None, 
            transform = Transform(hflip=transform["hflip"], vflip=transform["vflip"]), 
            controls = {"FrameRate": frame_rate}
        )
        logger.info(f"{video_config=}")
        self.picam2.configure(video_config)

        # apply controls 
        logger.info("Apply camera controls")
        self.apply_controls("AfMode", self._config.af_mode()) 
        self.apply_controls("AwbMode", self._config.awb_mode())
        self.apply_controls("Brightness", self._config.brightness())
        logger.info(f"{self.picam2.camera_controls=}")

    def apply_controls(self, name, value): 
        logger.info(f"apply_controls {name}: {value}")
        try: 
            if self.picam2 is not None: 
                self.picam2.set_controls({name: value})
                logger.info(f"{self.picam2.controls=}")
            else: 
                logger.warning("Camera is not opened yet") 
            return True 
        except Exception as e: 
            logger.warning(f"Error to apply controls: {e}")
            return False 
 
    # return True is transform changed    
    def update_transform(self, selected): 
        try: 
            transform = self._config.update_transform(selected) 
            return self._config.save() if transform is not None else False 
        except Exception as e: 
            raise Exception(f"Error to update transform: {e}")

    # return True is frame rate changed    
    def update_frame_rate(self, selected): 
        try: 
            frame_rate = self._config.update_frame_rate(selected) 
            return self._config.save() if frame_rate is not None else False 
        except Exception as e: 
            raise Exception(f"Error to update frame rate: {e}")

    # return False if no change     
    def update_resolution(self, selected): 
        try: 
            resolution = self._config.update_resolution(selected) 
            return self._config.save() if resolution is not None else False 
        except Exception as e: 
            raise Exception(f"Error to update resolution: {e}")

    # return False if no change  
    def apply_af_mode(self, selected): 
        try: 
            af_mode = self._config.update_af_mode(selected) 
            return self.apply_controls("AfMode", af_mode) if af_mode is not None else False  
        except Exception as e: 
            raise Exception(f"Error to apply AF mode: {e}")

    # return False if no change    
    def apply_awb_mode(self, selected): 
        try: 
            awb_mode = self._config.update_awb_mode(selected) 
            return self.apply_controls("AwbMode", awb_mode) if awb_mode is not None else False  
        except Exception as e: 
            raise Exception(f"Error to apply AWB mode: {e}")

    # return False if no change    
    def apply_brightness(self, value): 
        try: 
            brightness = self._config.update_brightness(value) 
            return self.apply_controls("Brightness", brightness) if brightness is not None else False  
        except Exception as e: 
            raise Exception(f"Error to apply brightness: {e}")

    @property 
    def settings(self): 
        return self._config.settings(full = True)  

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
            self.picam2.capture_file(_data, "main", format="png")
            logger.info(f"Image data size: {len(_data.getvalue())}")
            self._snapshot_buffer.write(_data.getvalue()) 
        except Exception as e: 
            logger.warning(f"Failed capture image: {e}")
        return self._snapshot_buffer 
    
    def restart(self): 
        logger.info("Restart video streaming") 
        self.stop() 
        self.start() 

    def start(self): 
        logger.info("Start video streaming") 
        try: 
            if self.picam2 is None: 
                self.open_camera() 
                self.picam2.start_recording(MJPEGEncoder(bitrate=32000000), FileOutput(self._stream_buffer)) 
            else: 
                logger.warning("Camera was not closed before open")
        except Exception as e: 
            logger.warning(f"Failed start video streaming: {e}") 

    def stop(self):  
        logger.info("Stop video streaming")
        try:
            if self.picam2 is not None: 
                self.picam2.stop_recording() 
                self.picam2.stop() 
                self.picam2.close() 
                self.picam2 = None 
                logger.info("Video streaming stopped") 
            else: 
                logger.warning("Camera is not opened yet")
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
            logger.info(f"HTTP request for {self.path}")
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
                            logger.warning("Failed capture live frame")
                            frame = video_server.logo.read() 
                        self.wfile.write(b"--FRAME\r\n")
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Content-Length", len(frame))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b"\r\n")
                except Exception as e:
                    logger.warning(f"Error for live video: {e}") 
                    self.send_error(404)
            elif self.path == "/snapshot.png":
                self.send_response(200)
                self.send_header("Content-type", "image/png")
                try: 
                    video_server = VideoServer() 
                    image = video_server.snapshot.read()
                    if image is None: 
                        logger.warning("failed capture snapshot")
                        image = video_server.logo.read() 
                    self.send_header("Content-Length", len(image))
                    self.end_headers() 
                    self.wfile.write(image)
                except Exception as e:
                    logger.warning(f"Error for snapshot: {e}")
                    self.send_error(404)
            else:
                if self.path == "/": 
                    self.path = "/camera.html" 
                elif not self.path.endswith(".html"): 
                    html_path = self.path + ".html" 
                    if os.path.exists(self.translate_path(html_path)):
                        self.path = html_path 
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
import socket 

def bash_run_d(command_args): 
    logger.info(f"{command_args=}")
    result = subprocess.run(command_args) 
    logger.debug(f"returncode: {result.returncode }")
    return result.returncode 

def bash_run(command_args): 
    logger.info(f"{command_args=}")
    result = subprocess.run(command_args, capture_output=True, text=True) 
    logger.debug(f"stdout---\n{result.stdout}")
    logger.debug(f"stderr--\n{result.stderr}") 
    logger.debug(f"returncode: {result.returncode }")
    return result.returncode 

def check_network_addr(interface): 
    logger.info("Check interface addresses")
    addresses = netifaces.ifaddresses(interface)
    logger.debug(f"stdout---\n{addresses}")
    if netifaces.AF_INET in addresses:
        ipv4_addresses = addresses[netifaces.AF_INET]
        if len(ipv4_addresses) > 0: 
            return ipv4_addresses[0]

def find_key_value(filename, key): 
    with open(filename) as f:
        for line in f: 
            logger.debug(line)
            parts = line.split("=") 
            if len(parts) > 1 and key == parts[0].strip(): 
                value = parts[1].strip().strip('\"') 
                return value  

def check_wifi_sta_id(): 
    wpa_conf = "/etc/wpa_supplicant/wpa_supplicant.conf"
    logger.info(f"Check wifi ssid and password from {wpa_conf}")
    ssid = find_key_value(wpa_conf, "ssid") 
    password = find_key_value(wpa_conf, "psk") 
    return ssid, password 

def check_wifi_ap_id(): 
    apd_conf = "/etc/hostapd/hostapd.conf"
    logger.info(f"Check wifi ssid and password from {apd_conf}")
    ssid = find_key_value(apd_conf, "ssid") 
    password = find_key_value(apd_conf, "wpa_passphrase") 
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
        } 

        # paths 
        self.camera_dir = os.path.dirname(os.path.abspath(__file__)) 
        self.software_dir = os.path.dirname(self.camera_dir) 
        self.network_dir = os.path.join(self.software_dir, "network") 
        self.system_dir = os.path.join(self.software_dir, "system") 
        self.updates_dir = os.path.join(self.software_dir, "updates") 
        logger.info(f"{self.camera_dir=}")
        logger.info(f"{self.software_dir=}") 
        logger.info(f"{self.network_dir=}") 
        logger.info(f"{self.system_dir=}") 
        logger.info(f"{self.updates_dir=}") 

    # send back a message to client 
    async def send_response(self, response): 
        logger.info(f"Send response: {response}")
        message = json.dumps(response)  
        await self._websocket.send(message)

    async def send_status_response(self, code = -1, message = "", id = None): 
        logger.info("Send status response...")
        await self.send_response({ "error": { "code": code, "message": message}, "id": id }) 

    async def send_result_response(self, result = None, id = None): 
        logger.info("Send result response...")
        await self.send_response({ "result": result, "id": id }) 

    # handle requests until the connection is closed  
    async def handle_requests(self): 
        try: 
            async for message in self._websocket: 
                try: 
                    request = json.loads(message) 
                    logger.info(f"Request received: {request}")
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
        logger.debug(f"{method=}")
        logger.debug(f"{params=}") 
        logger.debug(f"{id=}") 
        if method in self._handlers: 
            await self._handlers[method](params=params, id=id) 
        else: 
            logger.warning(f"Method not in list: {self._handlers.keys()}") 
            await self.send_status_response(-1, "Unsupported method", id)

    async def check_system_status(self, params = None, id = None): 
        logger.info("check_system_status") 
        result = {
            "hostname": socket.hostname
        }
        await self.send_result_response(result, id) 

    async def restart_system(self, params = None, id = None): 
        logger.warning("restart_system")
        try: 
            code = bash_run_d(["sudo", "-b", "bash", "-c", "sleep 5; reboot"]) 
            if code == 0: 
                await self.send_status_response(-1, "System restart, please reconnect later", id) 
            else: 
                 await self.send_status_response(code, "Failed to restart the system", id) 
        except Exception as e: 
            logger.warning(f"Error to restart the system: {e}") 
            await self.send_status_response(-1, "Error to restart the system", id)

    async def shutdown_system(self, params = None, id = None): 
        logger.warning("shutdown_system")
        try: 
            code = bash_run_d(["sudo", "-b", "bash", "-c", "sleep 5; shutdown now"])  
            if code == 0: 
                await self.send_status_response(-1, "System shutdown in seconds", id) 
            else: 
                 await self.send_status_response(code, "Failed to shutdown the system", id) 
        except Exception as e: 
            logger.warning(f"Error to shutdown the system: {e}") 
            await self.send_status_response(-1, "Error to shutdown the system", id)
   
    async def check_software_versions(self, params = None, id = None): 
        logger.info("check_software_versions")
        try: 
            code = bash_run([os.path.join(self.system_dir, "updates.sh"), "check"])
            if code == 0: 
                logger.info("Software updates checked successfully")
                await self.send_status_response(0, "Software updates checked successfully", id)
            else: 
                logger.warning("Failed to check software updates")
                await self.send_status_response(code, "Failed to check software updates", id)
        except Exception as e: 
            logger.warning(f"Error to check software updates: {e}") 
            await self.send_status_response(-1, "Error to check software updates", id) 

        installed_version = None 
        try: 
            version_file = os.path.join(self.software_dir, "VERSION.txt")
            logger.info(f"Check installed version from {version_file}")
            with open(version_file) as f: 
                for line in f: 
                    logger.debug(f"{line=}")
                    key, value = line.split("=") 
                    if key == "CURRENT_VERSION": 
                        installed_version = value.strip()
                        break 
        except Exception as e: 
            logger.warning(f"Error check installed version: {e}")
            await self.send_status_response(-1, "Error to check installed version", id)
        logger.info(f"{installed_version=}")

        latest_version = None 
        fallback_version = None 
        try: 
            version_file = os.path.join(self.updates_dir, "VERSION.txt")
            logger.info(f"Check latest and fallback version from {version_file}")
            with open(version_file) as f: 
                for line in f: 
                    logger.debug(f"{line=}")
                    key, value = line.split("=") 
                    if key == "CURRENT_VERSION": 
                        latest_version = value.strip() 
                    elif key == "FALLBACK_VERSION": 
                        fallback_version = value.strip() 
        except Exception as e: 
            logger.warning(f"Error to check updated versions: {e}")
            await self.send_status_response(-1, "Error to check updated versions", id)    
        logger.info(f"{latest_version=}")
        logger.info(f"{fallback_version=}")

        result = {
            "installed_version": installed_version, 
            "latest_version": latest_version, 
            "fallback_version": fallback_version,
        }
        await self.send_result_response(result, id) 
    
    async def install_software(self, params = None, id = None): 
        logger.info("install_software")
        version = params["version"] if "version" in params else None 
        logger.info(f"{version=}")
        if version:
            try: 
                logger.info(f"install software {version}") 
                await self.send_status_response(0, "Installation takes time, please wait...", id) 
                code = bash_run([os.path.join(self.system_dir, "updates.sh"), "install", version]) 
                if code == 0: 
                    await self.send_status_response(code, f"Software {version} installed successfully", id) 
                    await self.restart_system(id = id)
                else: 
                    await self.send_status_response(code, f"Failed to install software {version}", id) 
            except Exception as e: 
                logger.warning(f"Error to install software: {e}") 
                await self.send_status_response(-1, f"Error to install software {version}", id) 
        else: 
            await self.send_status_response(-1, "Software version is not set", id)

    async def check_wifi_ap_status(self, params = None, id = None): 
        logger.info("check_wifi_ap_status")
        try: 
            ssid, password = check_wifi_ap_id() 
            logger.info(f"{ssid=}") 
            logger.info(f"{password=}")
            if ssid is None: 
                await self.send_status_response(0, "WiFi AP is not setup", id) 
        except Exception as e: 
            logger.warning(f"Error checking wifi ap: {e}")
            await self.send_status_response(-1, "Error to check WiFi AP", id)  
            
        try: 
            address = check_network_addr("uap0")
            logger.info(f"uap0: {address}")
            if address is None: 
                await self.send_status_response(-1, "WiFi is not activated" , id) 
        except Exception as e: 
            logger.waning(f"Error to check wifi IP address: {e}") 
            await self.send_status_response(-1, "Error to check IP address", id)
            
        result = {
            "setup": { "ssid": ssid, "password": password }, 
            "address": address
        }
        await self.send_result_response(result, id)

    async def setup_wifi_ap(self, params = None, id = None): 
        logger.info(f"setup_wifi_ap: {params}") 
        await self.send_status_response(-1, "Not implemented", id)

    async def check_wifi_sta_status(self, params = None, id = None): 
        logger.info("check_wifi_sta_status")
        try: 
            ssid, password = check_wifi_sta_id() 
            logger.info(f"{ssid=}")
            logger.info(f"{password=}")
            if ssid is None: 
                await self.send_status_response(0, "WiFi STA is not setup", id) 
        except Exception as e: 
            logger.warning(f"Error to check wifi sta: {e}")
            await self.send_status_response(-1, "Error to check WiFi STA", id)  
        
        try: 
            address = check_network_addr("wlan0")
            logger.info(f"wlan0: {address}")
            if address is None: 
                await self.send_status_response(-1, "WiFi is not connected" , id)
        except Exception as e: 
            logger.waning(f"Error to check IP address: {e}") 
            await self.send_status_response(-1, "Error to check IP address", id)
            
        result = {
            "setup": { "ssid": ssid, "password": password }, 
            "address": address
        }
        await self.send_result_response(result, id)

    async def setup_wifi_sta(self, params = None, id = None): 
        logger.info(f"setup_wifi_sta: {params}") 
        if "ssid" in params: 
            ssid = params["ssid"] 
            password = params["password"] if "password" in params else None 
            try: 
                logger.info("check wifi settings")
                current_ssid, current_password = check_wifi_sta_id() 
                logger.info(f"{current_ssid=}") 
                logger.info(f"{current_password=}")
            except Exception as e: 
                logger.waning(f"Error to check wifi settings: {e}")

            if ssid == current_ssid and password == current_password: 
                await self.send_status_response(-1, "WiFi settings has no change", id)
            else: 
                try: 
                    code = bash_run([os.path.join(self.network_dir, "setup-wifi-sta.sh"), ssid, password])
                    if code == 0: 
                        await self.send_status_response(code, "WiFi settings changed", id) 
                        try: 
                            logger.info("restart network") 
                            script = os.path.join(self.network_dir, "restart-wifi.sh")
                            code = bash_run_d(["sudo", "-b", "bash", "-c", f"sleep 5; bash {script}"])
                            if code == 0: 
                                await self.send_status_response(-1, "Network restart, please reconnect later", id)
                            else: 
                                await self.send_status_response(code, "Failed to restart network", id)
                        except Exception as e: 
                            await self.send_status_response(-1, "Error to restart network", id)
                    else: 
                        await self.send_status_response(code, "Failed to change WiFi settings", id) 
                except Exception as e: 
                    logger.warning(f"Error to change wifi settings: {e}") 
                    await self.send_status_response(-1, "Error to change WiFi settings", id) 
        else: 
            await self.send_status_response(-1, "WiFi SSID is not set", id) 

    async def check_video_settings(self, params = None, id = None): 
        logger.info("check_video_settings") 
        try: 
            await self.send_result_response(VideoServer().settings, id)
        except Exception as e: 
            logger.warning(f"Error to check video settings: {e}") 
            await self.send_status_response(-1, "Error to check video settings", id) 

    async def setup_video(self, params = None, id = None): 
        logger.info(f"setup_video: {params}") 
        video_server = VideoServer() 
        try: 
            # apply controls 
            if ("af_mode" in params and video_server.apply_af_mode(params["af_mode"])): 
                logger.info("Video AF mode changed")
                await self.send_status_response(0, "Apply video AF mode successfully", id) 
            else: 
                pass # await self.send_status_response(0, "Video AF mode is not changed", id)
            if ("awb_mode" in params and video_server.apply_awb_mode(params["awb_mode"])): 
                logger.info("Video AWB mode changed")
                await self.send_status_response(0, "Apply video AWB mode successfully", id) 
            else: 
                pass # await self.send_status_response(0, "Video AWB mode is not changed", id) 
            if ("brightness" in params and video_server.apply_brightness(params["brightness"])): 
                logger.info("Video brightness changed")
                await self.send_status_response(0, "Apply video brightness successfully", id) 
            else: 
                pass # await self.send_status_response(0, "Video brightness is not changed", id) 
            # apply configurations 
            need_restart = False 
            if ("transform" in params and video_server.update_transform(params["transform"])): 
                logger.info("Video transform changed")
                await self.send_status_response(0, "Apply video transform successfully", id) 
                need_restart = True 
            else: 
                pass # await self.send_status_response(0, "Video transform is not changed", id)
            if ("frame_rate" in params and video_server.update_frame_rate(params["frame_rate"])): 
                logger.info("Video frame rate changed")
                await self.send_status_response(0, "Apply video frame rate successfully", id) 
                need_restart = True 
            else: 
                pass # await self.send_status_response(0, "Video frame rate is not changed", id)
            if ("resolution" in params and video_server.update_resolution(params["resolution"])): 
                logger.info("Video resolution changed")
                await self.send_status_response(0, "Apply video resolution successfully", id) 
                need_restart = True 
            else: 
                pass # await self.send_status_response(0, "Video resolution is not changed", id)
            # restart for configurations 
            if need_restart: 
                logger.warning("Restart video to apply configurations")
                # await self.send_status_response(-1, "Restart video, please reconnect later", id) 
                video_server.restart() 
        except Exception as e: 
            logger.warning(f"Error setup video: {e}") 
            await self.send_status_response(-1, "Error setup video", id)

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
        logger.info(f"Websocket connection from {websocket.remote_address[0]}") 
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
            logger.error(f"Remove websocket connection from {websocket.remote_address[0]}")
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
        "video_config": "video_config.json", 
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
    parser.add_argument("--log_level", type=str, default="DEBUG")

    # parser.print_help()
    args = parser.parse_args()
    logging.basicConfig(level=args.log_level, format="%(asctime)s - %(levelname)s - %(message)s")
    logger.info(vars(args))

    # start camera server with config file   
    main(args.config_file)
