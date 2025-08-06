#! /usr/bin/env bash 
set -e 

if [ "$#" -lt 1 ]; then 
    echo "Usage: $0 <SSID> [PASSWORD]" 
    exit 1
fi 

SSID="$1" 
PASSWORD="$2" 

# Reset SSID and PASSWORD for WiFi AP connection 
echo "Reset SSID and PASSWORD to ${SSID} ${PASSWORD}" 
CONF_FILE="/etc/hostapd/hostapd.conf" 
echo "CONF_FILE: ${CONF_FILE}" 
sudo cat "${CONF_FILE}" 
echo "" 
sudo sed -i "s/^\([[:space:]]*ssid[[:space:]]*=\)[[:space:]]*.*/\1${SSID}/" ${CONF_FILE}
sudo sed -i "s/^\([[:space:]]*wpa_passphrase[[:space:]]*=\)[[:space:]]*.*/\1${PASSWORD}/" ${CONF_FILE}
sudo cat "${CONF_FILE}"
echo ""

# Reset hostname in /etc/hostname 
echo "Reset hostname to ${SSID}" 
HOSTS_FILE="/etc/hosts" 
sudo hostnamectl hostname "${SSID}"

# Reset hostname in /etc/hosts 
echo "Reset hostname for local IP to ${SSID}" 
HOSTS_FILE="/etc/hosts" 
echo "HOSTS_FILE: ${HOSTS_FILE}" 
sudo cat "${HOSTS_FILE}" 
echo "" 
sudo sed -i "s/^\([[:space:]]*127.0.1.1[[:space:]]*\)[[:space:]]*.*/\1${SSID}/" ${HOSTS_FILE}
sudo cat "${HOSTS_FILE}"
echo ""
