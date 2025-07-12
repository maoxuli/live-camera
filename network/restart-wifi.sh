#! /usr/bin/env bash 
set -e 

echo "Restart WiFi AP and STA..." 
sudo systemctl stop uap@0 
sudo systemctl stop dhcpcd && sudo systemctl start uap@0 && sudo systemctl start dhcpcd
