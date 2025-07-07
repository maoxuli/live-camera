#!/usr/bin/env python 

import os 
import time 
import json 
import asyncio

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
import threading
from PIL import Image

# When the camera is not ready or in error state, we will show a "logo" 
# image. The logo image is refreshed in 1 fps, so could be "read" once 
# or in a loop. 
class LogoBuffer(io.BufferedIOBase): 
    def __init__(self, image_file = None): 
        self._condition = threading.Condition()
        self._frame = None 
        # load static image 
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
        logger.info(f"Image size: {len(self._frame)}")
        # control frame rate 
        self._start_timer() 

    def _start_timer(self, timeout = 1): # 1 fps  
        timer = threading.Timer(timeout, self._on_timer) 
        timer.start()

    def _on_timer(self): 
        with self._condition: 
            self._condition.notify_all() 
        self._start_timer() 

    def read(self): 
        with self._condition: 
            self._condition.wait() 
            return self._frame 

# Frame of video stream is supposed to be "write" and "read" in a loop. 
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

# Snapshot "write" and "read" a single image at once. 
class FrameBuffer(io.BufferedIOBase): 
    def __init__(self): 
        self._lock = threading.Lock() 
        self._frame = None 

    def write(self, buf): 
        with self._lock: 
            self._frame = buf 

    def read(self): 
        with self._lock: 
            return self._frame 

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
        logo_file = self._config["logo_file"] if "logo_file" in self._config else None 
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
        except Exception as e: 
            logger.warning(f"Failed stop video streaming: {e}")


# Web server serves web pages, including the live video page, snapshot page, and admin page. 
# It also handle the request of video stream and snapshot image. 
            
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

    def __init__(self, port = 8080, root = None): 
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
        logger.info(f"Income connection from {connection.remote_address[0]}")
        logger.info(f"Request path: {connection.request.path}")
        self._connections.add(connection)
        try:
            async for message in connection:
                await self.handle_message(message, connection)
            await connection.wait_closed()
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            logger.info(f"Remove connection from {connection.remote_address[0]}")
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
        "web_root": "www",
    }
    logger.info(f"Default camera config: {config}")

    # overwrite with config file 
    if config_file: 
        with open(config_file) as f: 
            config.update(json.load(f))
            logger.info(f"Updated camera config: {config}")

    # run video stream server 
    video_config = config["video_config"] 
    logger.info(f"{video_config=}") 
    video_server = VideoServer(video_config) 
    video_server.start() 

    # run web server 
    http_port = config["http_port"]
    logger.info(f"{http_port=}") 
    web_server = WebServer(http_port)
    web_server.start() 

    # run websocket server 
    ws_port = config["ws_port"] 
    logger.info(f"{ws_port=}")
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
    parser.add_argument("--log_level", type=str, default="INFO")

    # parser.print_help()
    args = parser.parse_args()
    logging.basicConfig(level=args.log_level, format="%(asctime)s - %(levelname)s - %(message)s")
    logger.info(vars(args))

    # start camera server with config file   
    asyncio.run(main(args.config_file))
