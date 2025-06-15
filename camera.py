#!/usr/bin/env python 

import json 
import asyncio

import logging
logger = logging.getLogger(__name__)

# support singleton pattern 
def singleton(cls):
    instances = {}
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper


# using a buffer to deliver frame from video server to web server 
import io
import threading
from PIL import Image
from picamera2 import Picamera2
from picamera2.encoders import JpegEncoder
from picamera2.outputs import FileOutput
import libcamera

class LogoBuffer(io.BufferedIOBase): 
    def __init__(self, image_file = None): 
        self._condition = threading.Condition()
        self._frame = None 
        # static image frame 
        if image_file: 
            with open(image_file, "rb") as f: 
                self._frame = f.read()
        else: 
            buf = io.BytesIO()
            image = Image.new("RGB", (1280, 720), (0, 0, 0)) 
            image.save(buf, format='jpeg') 
            self._frame = buf.getvalue() 
        # control frame rate 
        self._start_timer() 

    def _start_timer(self): 
        timer = threading.Timer(1, self.on_timer) 
        timer.start()

    def on_timer(self): 
        with self._condition: 
            self._condition.notify_all() 
        self._start_timer() 

    def read(self): 
        with self._condition: 
            self._condition.wait() 
            return self._frame 

import time 
class FrameBuffer(io.BufferedIOBase):
    def __init__(self):
        self._condition = threading.Condition()
        self._frame = None 
        self._last_write_t = time.time()
        self._last_read_t = time.time()

    def write(self, buf):
        with self._condition:
            if time.time() - self._last_write_t > 0.05: 
                logger.warning(f"write: {time.time() - self._last_write_t}")
            self._last_write_t = time.time()
            self._frame = buf
            self._condition.notify_all()

    def read(self): 
        with self._condition:
            if time.time() - self._last_read_t > 0.1: 
                logger.warning(f"read: {time.time() - self._last_read_t}")
            self._last_read_t = time.time()
            return self._frame if self._condition.wait(1) else None 

# video streaming server 
@singleton 
class VideoServer(object): 
    def __init__(self, config_file = None): 
        # default config for video streaming 
        self._config = {
            "resolution": (1280, 720), 
            "frame_rate": 30, 
            "af_mode": 0, 
        }
        logger.debug(f"Default video config: {self._config}")

        # overwrite with config file 
        if config_file: 
            with open(config_file) as f: 
                self._config.update(json.load(f)) 
                logger.debug(f"Updated video config: {self._config}")

        # logo buffer for waiting logos 
        logo_file = self._config["logo_file"] if "logo_file" in self._config else None 
        self._logo_buffer = LogoBuffer(logo_file) 

        # snapshot buffer 
        self._snapshot_buffer = FrameBuffer() 

        # stream buffer 
        self._stream_buffer = FrameBuffer()

        # camera handle  
        self.picam = Picamera2() 

        # snapshot could use different config        
        self.snapshot_config = None 
        if "snapshot" in self._config: 
            _snapshot_config = self._config["snapshot_config"]
            logger.info(f"snapshot config: {_snapshot_config}")
            resolution = _snapshot_config["resolution"] 
            logger.debug(f"{resolution=}")
            self.snapshot_config = self.picam.create_still_configuration(main={"size": resolution})

        # streaming config 
        resolution = self._config["resolution"] 
        logger.debug(f"{resolution=}")
        stream_config = self.picam.create_video_configuration(main={"size": resolution})
        self.picam.configure(stream_config)
        self.picam.set_controls({"AfMode": libcamera.controls.AfModeEnum.Continuous})

    @property
    def stream(self): 
        return self._stream_buffer  
    
    @property
    def snapshot(self): 
        self.picam.switch_mode_and_capture_file(self.snapshot_config, self._snapshot_buffer, format="jpeg")
        return self._snapshot_buffer 
    
    @property
    def logo(self): 
        return self._logo_buffer

    def get_param(self, name): 
        logger.info(f"Get video param {name}")
        if name in self._config: 
            return self._config[name] 
        
    def set_param(self, name, value): 
        logger.info(f"Set video param {name} to {value}")
        self._config[name] = value 
    
    def start(self): 
        logger.info("Start video streaming")
        try: 
            self.picam.start_recording(JpegEncoder(), FileOutput(self._stream_buffer)) 
        except Exception as e: 
            logger.warning(f"Failed start video streaming: {e}") 

    def stop(self):  
        logger.info("Stop video streaming")
        try:
            self.picam.stop_recording()  
        except Exception as e: 
            logger.warning(f"Failed stop video streaming: {e}")


# web server for video streaming to web page 
import threading 
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler 

@singleton 
class WebServer(object): 
    class HttpRequestHandler(SimpleHTTPRequestHandler):
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
                self.send_header('Content-type', 'image/jpeg')
                self.end_headers()
                try: 
                    video_server = VideoServer() 
                    image = video_server.snapshot.read() 
                    logger.warning("Failed capture snapshot")
                    if image is None: 
                        image = video_server.logo.read() 
                    self.wfile.write(image)
                    self.wfile.write(b"\r\n")
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
        

# websocket server for communications from camera to web page 
import websockets
from http import HTTPStatus

@singleton
class WebsocketServer(object): 
    def __init__(self, port = 8090): 
        self._port = port 
        self._connections = set()  

    async def broadcast(self, message, connection = None): 
        for conn in self._connections: 
            if conn != connection: 
                await conn.send(message)

    async def respond(self, message, connection): 
        await connection.send(message)

    async def handle_message(self, message, connection): 
        logger.info(f"Handle websocket message: {message}")
        await self.respond("xxxxxxxxxxxxx", connection)
        await self.broadcast("yyyyyyyyyyy")

    # handle client connection
    async def handle_client(self, connection):
        logger.debug(f"Income connection from {connection.remote_address[0]}")
        logger.debug(f"Request path: {connection.request.path}")
        self._connections.add(connection)
        try:
            async for message in connection:
                await self.handle_message(message, connection)
            await connection.wait_closed()
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            logger.debug(f"Remove connection from {connection.remote_address[0]}")
            self._connections.remove(connection)

    # health check enpoint 
    async def health_check(self, connection, request):
        if request.path == "/healthz":
            return connection.respond(HTTPStatus.OK, "OK\n")


# start camera server(s) based on config file 
async def main(config_file = None): 
    # default config 
    config = {
        "ws_port": 8090, 
        "http_port": 8080, 
        "video_config": "video.json", 
        "network_config": "network.json",
    }
    logger.debug(f"Default camera config: {config}")

    # overwrite with config file 
    if config_file: 
        with open(config_file) as f: 
            config.update(json.load(f))
            logger.debug(f"Updated camera config: {config}")

    # run video stream server 
    video_config = config["video_config"] 
    logger.debug(f"{video_config=}") 
    video_server = VideoServer(video_config) 
    video_server.start() 

    # run web server 
    http_port = config["http_port"]
    logger.debug(f"{http_port=}") 
    web_server = WebServer(http_port)
    web_server.start() 

    # run websocket server 
    ws_port = config["ws_port"] 
    logger.debug(f"{ws_port=}")
    ws_server = WebsocketServer(ws_port)
    try:
        logger.info(f"Start websocket server at port: {ws_server._port}")
        async with websockets.serve(ws_server.handle_client, "", ws_server._port, 
                                    process_request=ws_server.health_check) as server: 
            await server.wait_closed()
    except KeyboardInterrupt:
        logger.warning("Exit web server...") 
        await server.close() 
    except Exception as e:
        print(f"Websocket server exception: {e}")
    finally: 
        web_server.stop() 
        video_server.stop() 


import argparse
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Camera Server")
    parser.add_argument("--config_file", "-c", type=str, default="camera.json")
    parser.add_argument("--debug_level", "-d", type=str, default="INFO")

    # parser.print_help()
    args = parser.parse_args()
    logging.basicConfig(level=args.debug_level, format="%(asctime)s - %(levelname)s - %(message)s")
    logger.debug(vars(args))

    # start camera server with config file   
    asyncio.run(main(args.config_file))
