# LiveCamera 

# WiFi/network setup 

The "network" folder includes all configurations and scripts to make the "camera" system accessible through different networks, including the wired "ethernet" connection, the WiFi client connection to WiFi router/hotspot, and the WiFi access point (AP) hosted on the Raspberry Pi system. 

# Camera/video software 

The "camera" folder includes the software/code for the camera system administration and the video streaming. The software was designed and implemented as a typical browser/server system. The webserver, websocket server, and video streaming server run on the Raspberry Pi system. The users connect to the camera system with browsers, complete system/video administration and watch live video with the web pages in the browser. 

# System/software updates 

The "updates" folder includes scripts to help remote/automatic software updates. Currently we only support the updates on application level, e.g. the updates for administration features and the web GUI, the updates for video streaming configuration and the web GUI. The lower level updates, e.g. camera server(s) updates, network updates, and OS updates, are not supported currently. 
