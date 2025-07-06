## Network/WiFi setup for Raspberry Pi 

Here are steps to setup WiFi AP + Client for Raspberry Pi, tested on Raspberry Pi Zero 2W. Further testing is necessary for other Raspberry Pi modules. 

1. Start from official Raspberry Pi OS 

The testing is done on Raspberry Pi OS Lite (64-bit). Further testing is necessary for other Raspberry Pi OS editions. 

Please refer to official documents to install and run proper Raspberry Pi OS on the Raspberry Pi module. 

2. Prepare Raspberry Pi system with internet access 

The internet access for Raspberry Pi system need to be enabled, with ethnet connection or WiFi client connection. Please refer to official documents about ethernet and WiFi client configuration.   

The setup for WiFi AP + client will be done in terminal. Because the network connections could be disrupted during the setup, the best way is working on the Raspberry Pi module with locally connected monitor and keyboard. Please refer to official documents about local run of the Raspberry Pi OS and remote access of Raspberry Pi system through SSH. 

3. Network/WiFi configuration and setup scripts 

The "network-setup" folder includes all network/WiFi configuration files and setup scripts. You may copy the folder to Raspberry Pi system from other computers or download it from Github repo.  

The initial installation could be done with below script. The WiFi AP + Client should already configured after you reboot the system.  

        ./network-init.sh 

Other scripts are used to reset the SSID/Password for WiFi client connection or WiFi AP. 

4. Default WiFi AP  

The default SSID and password for WiFi API is "LiveCamera/password". The default IP address for the camera system is "10.0.0.1". The WiFi AP is always online so you may connect to the Raspberry Pi system through WiFi AP at any time. 

The WiFi AP is designed to be used for configuration and administration only. Video streaming should be through WiFi client connection.  

5. WiFi client connection  

We need to (re)set the SSID/Password for WiFi client connection, whenever we move to a new WiFi router/network. This will be done through the WiFi AP connection.  

Once we connected to the camera through WiFi AP, we could open the "admin" web page, where we could (re)set the SSID/Password for the (new) WiFi router/network. We can also find the dynamic information of the network, e.g. the IP address of the system assigned to WiFi client connection, and the IP address assigned to the ethernet connection.  

Once the camera connected to the WiFi router/network successfully with WiFi client connection, we should also connect to the WiFi router/network as usually to watch the video streaming. 