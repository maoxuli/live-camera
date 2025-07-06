# LiveCamera/video streaming software 


    from libcamera import Transform 
    transform = Transform(hflip=transform["hflip"], vflip=transform["vflip"])
    buffer_count = 2
    queue=False

    config = picam2.create_video_configuration(main={"size": (1920, 1080)}, lores={"size": (1280,
    720)}, encode="lores")

    # 30 fps 
    'FrameDurationLimits': (33333, 33333)
    # 25 fps 
    controls={"FrameDurationLimits": (40000, 40000)}

    logger.info(picam2.camera_configuration())
