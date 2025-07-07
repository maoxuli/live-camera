#! /usr/bin/env bash 
set -e 

CAMERA_ROOT="/home/pi/live-camera/camera"
echo "CAMERA_ROOT: ${CAMERA_ROOT}" 

echo "Start camera software..." 
cd "${CAMERA_ROOT}" 
python camera.py -c camera.json 
echo "Exit camera software!" 
