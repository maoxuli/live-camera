import json 
import logging
logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "version": "1.0",
    "transform": {
        "options": [
            {
                "name": "Identity", 
                "value": {
                    "hflip": False, 
                    "vflip": False
                }
            }, 
            {
                "name": "Horizontal Flip", 
                "value":  {
                    "hflip": True, 
                    "vflip": False
                }
            }, 
            {
                "name": "Vertical Clip", 
                "value": {
                    "hflip": False, 
                    "vflip": True
                }
            }, 
            {
                "name": "180&#176 Rotation", 
                "value": {
                    "hflip": True, 
                    "vflip": True
                }
            }
        ], 
        "selected": 0
    },
    "frame_rate": {
        "options": [
            {"name": "10 fps", "value": 10.0}, 
            {"name": "15 fps", "value": 15.0}, 
            {"name": "20 fps", "value": 20.0}, 
            {"name": "25 fps", "value": 25.0}, 
            {"name": "30 fps", "value": 30.0}
        ], 
        "selected": 3
    }, 
    "resolution": {
        "options": [
            {"name": "640x480 (4:3)", "value": [640, 480]}, 
            {"name": "800x600 (4:3)", "value": [800, 600]},
            {"name": "1280x720 (16:9)", "value": [1280, 720]},
            {"name": "1920x1080 (16:9)", "value": [1920, 1080]}
        ], 
        "selected": 2
    }, 
    "snapshot_resolution": {
        "options": [
            {"name": "1280x720 (16:9)", "value": [1280, 720]},
            {"name": "1920x1080 (16:9)", "value": [1920, 1080]}, 
            {"name": "3840x2160 (16:9)", "value": [3840, 2160]}
        ], 
        "selected": 2
    }, 
    "af_mode": {
        "options": [
            {"name": "Manual", "value": 0}, 
            {"name": "Auto", "value": 1}, 
            {"name": "Continuous", "value": 2}
        ], 
        "selected": 2
    }, 
    "awb_mode": {
        "options": [
            {"name": "Off", "value": 0}, 
            {"name": "Auto", "value": 1}, 
            {"name": "Tungsten", "value": 2}, 
            {"name": "Fluorescent", "value": 0}, 
            {"name": "Indoor", "value": 1}, 
            {"name": "Daylight", "value": 2}, 
            {"name": "Cloudy", "value": 2}
        ], 
        "selected": 1
    }, 
    "brightness": {
        "range": [-1, 1], 
        "value": 0
    }    
}

class VideoConfig(object): 
    def __init__(self, config_file = "video_config.json"): 
        self._config_file = config_file 
        self._settings = DEFAULT_SETTINGS 
        logger.debug("Default settings:")
        logger.debug(self._settings)
        if self._config_file is not None: 
            logger.info(f"Load settings from {self._config_file}")
            with open(self._config_file) as f: 
                settings = json.load(f) 
                logger.debug("Override settings:")
                logger.debug(settings) 
                self._settings.update(settings) 
        logger.debug("Video settings:")
        logger.debug(self._settings) 

    def save(self): 
        logger.info(f"Save settings to {self._config_file}")
        with open(self._config_file, "w") as f: 
            json.dump(self._settings, f) 

    def settings(self, full = False): 
        if full: 
            return self._settings 
        else: 
            return {
                "transform": self.transform(), 
                "frame_rate": self.frame_rate(), 
                "resolution": self.resolution(), 
                "snapshot_resolution": self.snapshot_resolution(), 
                "af_mode": self.af_mode(), 
                "awb_mode": self.awb_mode(), 
                "brightness": self.brightness(), 
            }
    
    def _option_value(self, name, full = False): 
        if name in self._settings: 
            settings = self._settings[name] 
            if full: 
                return settings 
            else: 
                option = settings["options"][settings["selected"]] 
                return option["value"] 
        else: 
            raise Exception(f"{name} is not set")
            
    def _update_option_value(self, name, selected): 
        if name in self._settings: 
            settings = self._settings[name] 
            if settings["selected"] != selected: 
                options = self._settings[name]["options"] 
                if selected < len(options): 
                    settings["selected"] = selected 
                    return options[selected]
                else: 
                    raise Exception(f"Option index is out of range: {selected}") 
        else: 
            raise Exception(f"{name} is not in configuration")
        
    def _range_value(self, name, full = False): 
        if name in self._settings: 
            settings = self._settings[name] 
            if full: 
                return settings 
            else: 
                return settings["value"]
        else: 
            raise Exception(f"{name} is not set")

    def _update_range_value(self, name, value): 
        if name in self._settings: 
            settings = self._settings[name] 
            if settings["value"] != value: 
                range = self._settings[name]["range"] 
                if value >= range[0] and value <= range[1]: 
                    settings["value"] = value 
                    return settings["value"] 
                else: 
                    raise Exception(f"Value is out of range: {value}")
        else: 
            raise Exception(f"{name} is not in configuration")
        
    def transform(self, full = False): 
        return self._option_value("transform", full) 
    
    def update_transform(self, selected): 
        return self._update_option_value("transfrom", selected) 
    
    def frame_rate(self, full = False): 
        return self._option_value("frame_rate", full) 
    
    def set_frame_rate(self, selected): 
        return self._update_option_value("frame_rate", selected) 
        
    def resolution(self, full = False): 
        return self._option_value("resolution", full) 
    
    def set_resolution(self, selected): 
        return self._update_option_value("resolution", selected) 
    
    def snapshot_resolution(self, full = False): 
        return self._option_value("snapshot_resolution", full) 
    
    def set_snapshot_resolution(self, selected): 
        return self._update_option_value("snapshot_resolution", selected) 
    
    def af_mode(self, full = False): 
        return self._option_value("af_mode", full) 
    
    def set_af_mode(self, selected): 
        return self._update_option_value("af_mode", selected) 
    
    def awb_mode(self, full = False): 
        return self._option_value("awb_mode", full) 
    
    def set_awb_mode(self, selected): 
        return self._update_option_value("awb_mode", selected) 
    
    def brightness(self, full = False): 
        return self._range_value("brightness", full) 
    
    def set_brightness(self, value): 
        return self._update_range_value("brightness", value) 
    