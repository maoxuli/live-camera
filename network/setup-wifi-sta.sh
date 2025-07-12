#! /usr/bin/env bash 
set -e 

if [ "$#" -lt 1 ]; then 
    echo "Usage: $0 <SSID> [PASSWORD]" 
    exit 1
fi 

SSID="$1" 
PASSWORD="$2" 

# Reset SSID and PASSWORD for WiFi client connection 
CONF_FILE="/etc/wpa_supplicant/wpa_supplicant.conf" 
echo "CONF_FILE: ${CONF_FILE}" 
sudo cat "${CONF_FILE}" 
echo "" 

echo "Reset SSID and PASSWORD..." 
sudo sed -i "s/^\([[:space:]]*ssid[[:space:]]*=\)[[:space:]]*.*/\1\"${SSID}\"/" ${CONF_FILE}
sudo sed -i "s/^\([[:space:]]*psk[[:space:]]*=\)[[:space:]]*.*/\1\"${PASSWORD}\"/" ${CONF_FILE}
sudo cat "${CONF_FILE}"
echo ""
