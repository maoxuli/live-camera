#! /usr/bin/env bash 
set -e 

CAMERA_ROOT="/home/pi/live-camera/camera"
echo "CAMERA_ROOT: ${CAMERA_ROOT}" 

echo "Start camera software at ${CAMERA_ROOT}..." 
python "${CAMERA_ROOT}/camera.py" -c "${CAMERA_ROOT}/camera.json" 
echo "Camera software exit!" 
