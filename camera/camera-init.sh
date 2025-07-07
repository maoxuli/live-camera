#! /usr/bin/env bash 
set -e 

# depedent software and tools   
sudo apt-get update \
    && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3-pillow \
        python3-websockets \
        python3-picamera2 \
    && sudo apt-get autoremove \
    && sudo apt-get clean \
    && sudo rm -rf /var/lib/apt/lists/*

# current directory 
BASH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
echo "BASH_DIR: ${BASH_DIR}" 

# entry script for the camera software 
echo "Install camera start script..." 
cat "${BASH_DIR}/camera.sh" 
echo "" 
sed -i "s/^\([[:space:]]*CAMERA_ROOT[[:space:]]*=\)[[:space:]]*.*/\1\"${BASH_DIR//\//\\/}\"/" "${BASH_DIR}/camera.sh"
cat "${BASH_DIR}/camera.sh" 
echo "" 
sudo cp -r ${BASH_DIR}/camera.sh /usr/local/bin/camera.sh 
sudo chmod a+x /usr/local/bin/camera.sh 

# systemd service for the camera software
echo "Install camera service..." 
sudo cp -f "${BASH_DIR}/camera.service" /etc/systemd/system/camera.service 
sudo chmod 644 /etc/systemd/system/camera.service 

echo "Enable camera service..." 
sudo systemctl enable camera 
echo "Done!" 
