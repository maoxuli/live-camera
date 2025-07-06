#! /usr/bin/env bash 
set -e 

echo "Reset WiFi network..." 
sudo systemctl stop uap@0 
sudo systemctl stop dhcpcd && sudo systemctl start uap@0 && sudo systemctl start dhcpcd
