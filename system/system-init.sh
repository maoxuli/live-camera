#! /usr/bin/env bash 
set -e 

# depedent software and tools   
sudo apt-get update \
    && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3-pillow \
        python3-websockets \
        python3-picamera2 \
        python3-netifaces \
    && sudo apt-get autoremove \
    && sudo apt-get clean \
    && sudo rm -rf /var/lib/apt/lists/*

# important locations   
SYSTEM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
CAMERA_DIR="$(cd "${SYSTEM_DIR}/../camera" && pwd)" 
echo "SYSTEM_DIR: ${SYSTEM_DIR}" 
echo "CAMERA_DIR: ${CAMERA_DIR}" 

# install entry script for the camera software 
echo "Install camera start script..." 
cat "${SYSTEM_DIR}/camera.sh" 
echo "" 
sed -i "s/^\([[:space:]]*CAMERA_ROOT[[:space:]]*=\)[[:space:]]*.*/\1\"${CAMERA_DIR//\//\\/}\"/" "${SYSTEM_DIR}/camera.sh"
cat "${SYSTEM_DIR}/camera.sh" 
echo "" 
sudo cp -r ${SYSTEM_DIR}/camera.sh /usr/local/bin/camera.sh 
sudo chmod a+x /usr/local/bin/camera.sh 

# install systemd service for the camera software
echo "Install camera service..." 
sudo cp -f "${SYSTEM_DIR}/camera.service" /etc/systemd/system/camera.service 
sudo chmod 644 /etc/systemd/system/camera.service  
sudo systemctl enable camera 
echo "Camera service enabled" 
