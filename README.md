# LiveCamera 

# WiFi/network setup 

The "network" folder includes all configurations and scripts to make the "camera" system accessible through different networks, including the wired "ethernet" connection, the WiFi client connection to WiFi router/hotspot, and the WiFi access point (AP) hosted on the Raspberry Pi system. 

# Camera/video software 

The "camera" folder includes the code and configuration for the camera software. The software was designed and implemented as a typical browser/server system. The webserver, websocket server, and video streaming server run on the Raspberry Pi system. The users connect to the camera system with web browsers, to complete administration and watch live video. 

# System service 

The "system" folder includes some scripts that install a systemd service, which enabled the camera software automatically launched with the system startup. 

# Software updates 

The "updates" folder includes scripts to help remote/automatic software updates. 
