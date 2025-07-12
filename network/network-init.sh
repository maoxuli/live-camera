#! /usr/bin/env bash 
set -e 

# This solution is based on dhcpcd/wpa_supplicant/hostapd/dnsmasq. 

# Install necessary tools   
sudo apt-get update \
    && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        dhcpcd5 \
        hostapd \
        dnsmasq \
        netifaces \
        netfilter-persistent \
        iptables-persistent \
    && sudo apt-get autoremove \
    && sudo apt-get clean \
    && sudo rm -rf /var/lib/apt/lists/*

# Disable unnecessary services 
sudo systemctl disable NetworkManager 
sudo systemctl disable systemd-networkd  
sudo systemctl unmask hostapd

# current directory 
BASH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
echo "BASH_DIR: ${BASH_DIR}" 

# wpa_supplicant is used to manage the WiFi client connection 
# but it needs to be started after the ap, triggered by dhcpcd  
echo "Configuring wpa_supplicant..." 
sudo cp -f ${BASH_DIR}/config/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf 
sudo chmod 600 /etc/wpa_supplicant/wpa_supplicant.conf 
sudo systemctl disable wpa_supplicant

# hostapd is used to manage the WiFi AP connection 
# but it swill be start by systemd service, after uap0 created 
echo "Configuring hostapd..."  
sudo cp -f ${BASH_DIR}/config/hostapd.conf /etc/hostapd/hostapd.conf 
sudo chmod 600 /etc/hostapd/hostapd.conf
sudo systemctl disable hostapd

# create uap0 on system startup and delete it with wifi stopped 
echo "Creating uap0..." 
sudo cp -f ${BASH_DIR}/config/uap@.service /etc/systemd/system/uap@.service  
sudo chmod 644 /etc/systemd/system/uap@.service 
sudo systemctl enable uap@0
sudo rfkill unblock wlan 

# config dhcpcd with DHCP client for wlan0 and static IP for uap0 
echo "Configuring dhcpcd..." 
sudo cp -f /usr/share/dhcpcd/hooks/10-wpa_supplicant /usr/lib/dhcpcd/dhcpcd-hooks/10-wpa_supplicant
sudo cp -f ${BASH_DIR}/config/dhcpcd.conf /etc/dhcpcd.conf 
sudo chmod 600 /etc/dhcpcd.conf 

# config dnsmasq with DHCP server for uap0   
echo "Configuring dnsmasq..." 
sudo cp -f ${BASH_DIR}/config/dnsmasq.conf /etc/dnsmasq.conf 
sudo chmod 600 /etc/dnsmasq.conf 

# config routing between uap0 and eth0/wlan0 
echo "Configuring route table..." 
sudo cp -f ${BASH_DIR}/config/routed-ap.conf /etc/sysctl.d/routed-ap.conf 
sudo chmod 600 /etc/sysctl.d/routed-ap.conf 

sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
sudo iptables -A FORWARD -i wlan0 -o uap0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i uap0 -o wlan0 -j ACCEPT
sudo netfilter-persistent save

# reboot system 
echo "Configuration done!" 
echo "Please restart system with: sudo reboot now" 
# sudo reboot now 
