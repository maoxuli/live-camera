## Network/WiFi for Raspberry Pi 

Here are steps to setup dual-mode WiFi (AP + STA) for Raspberry Pi, tested on Raspberry Pi Zero 2W. Further testing is necessary for other Raspberry Pi modules. 

1. Start from official Raspberry Pi OS 

The testing is done on Raspberry Pi OS Lite (64-bit). Further testing is necessary for other Raspberry Pi OS editions. 

Please refer to official documents to install and run proper Raspberry Pi OS on the Raspberry Pi module. 

2. Prepare Raspberry Pi system with internet access 

The internet access for Raspberry Pi system is needed for the installation, which could be through WiFi STA connection or through ethernet connection (with micro-USB to ethernet adapter). Please refer to official documents about WiFi STA and ethernet configuration.   

The setup for dual-mode WiFi will be done in terminal. Because the network connections could be disrupted during the setup, the best way is working on the Raspberry Pi module with locally connected monitor and keyboard. Please refer to official documents about local run of the Raspberry Pi OS and/or remote access of Raspberry Pi system through SSH. 

3. Network/WiFi configuration and setup scripts 

The "network-setup" folder includes all network/WiFi configuration files and setup scripts. You may copy the folder to Raspberry Pi system (in any ways that is available for you), or download it from Github repo after the Respberry Pi system has internet access.  

The initial installation could be done with the setup script. Then the dual-mode WiFi will be enabled after the system is restarted.  

        ./network-init.sh 

There are other tool scripts that are used to setup the SSID/password for WiFi STA connection or WiFi AP, which will be called to support user's operations on web UI. 

4. WiFi AP  

The default SSID and password for WiFi AP is "LiveCamera/secret". The default IP address for the camera system is "10.0.0.1". The WiFi AP is always online so you may connect to the Raspberry Pi system through WiFi AP at any time. 

The WiFi AP is designed to be used for configuration and administration only. Video streaming should be through WiFi STA connection.  

5. WiFi STA connection  

We need to (re)set the SSID/password for WiFi STA connection, whenever we move to a new WiFi router/network. This will be done through the web UI over the WiFi AP connection. Once we connected to the camera through WiFi AP, we could open the administrative web page ("https://10.0.0.1:8080/admin.html"), where we could (re)set the SSID/password for the (new) WiFi router/network. 

We can also check the IP address of current WiFi STA connection, which is assigned by the WiFi router/network. The user will connect to the camera with WiFi STA IP to watch the live video.   
