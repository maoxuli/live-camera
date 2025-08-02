/*!
 * VERSION: 2.4
 * DATE: 08-12-2020
 * 
 * PinchZoomer
 *
 * @license Copyright (c) 2018, Ron Feliciano. All rights reserved.
 * This work is subject to the terms at http://codecanyon.net/licenses
 * 
 * @author: Ron Feliciano
 * contact me through http://codecanyon.net/user/ronfeliciano/?ref=ronfeliciano
 **/
 
(function(window, $)
{
	function Utils()
	{
		
	}
	
    Utils.browser = (function()
	{
		var ua= navigator.userAgent, 
			tem, 
			M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
		
		if(/trident/i.test(M[1]))
		{
			tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
			return {name:"IE", version:(tem[1] || '') };
		}
		M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
		
		if((tem= ua.match(/version\/([\.\d]+)/i))!= null) 
		{
			M[2]= tem[1];
		}
		
		if(M.length > 2)
		{
			return {name:M[0], version:M[2] };
		}
		else
		{
			return {name:M[0], version:M[1] };
		}
		
	})();
    
	Utils.getRealValue = function (str)
	{
		var val = str;
		if(str !== undefined)
		{
			if(!isNaN(Number(str)))
			{
				val = Number(str);
			}
			else if(str.toLowerCase !== undefined && (str.toLowerCase() == "true" || str.toLowerCase() == "false"))
			{
				val = (str.toLowerCase() == "true");
			}
			else
			{
				var temp = $.trim(str);
				
				if(temp.length >= 2 && temp.charAt(0) == "'"  && temp.charAt(temp.length - 1) == "'")
				{
					temp = temp.substr(1, temp.length - 2);
					val = temp;
				}	
			}
		}
						
		return val;
	}
	
	Utils.hyphenToCamelCase = function(value)
	{
		return value.replace(/-([a-z])/gi, function(s, g) { return g.toUpperCase(); } );
	}
	
	Utils.preventDefault = function (e)
	{
        if (e.preventDefault) 
        { 
            e.preventDefault(); 
        } 
        else 
        { 
            e.returnValue = false; 
        }
	}
	
	Utils.preventGestureDefault = function(e)
	{
		if(e !== undefined && e.gesture != undefined)
		{
			e.gesture.preventDefault();
		}
	}
	
	Utils.objectSplit = function(myStr, splitChar)
	{
		var arr = [],
			openBraceCtr = 0,
			closeBraceCtr = 0,
			openAngleCtr = 0,
			closeAngleCtr = 0;
		
		var splitStr = "";
		for(var i = 0; i < myStr.length; i++)
		{
			var myChar = myStr.charAt(i);
			
			if(myChar == '{')
			{
				openBraceCtr++;
			}
			else if(myChar == '}')
			{
				closeBraceCtr++;
			}
			else if(myChar == '[')
			{
				openAngleCtr++;
			}
			else if(myChar == ']')
			{
				closeAngleCtr++;
			}
			
			if(openBraceCtr == closeBraceCtr && openAngleCtr == closeAngleCtr)
			{
				if(myChar != splitChar)
				{
					splitStr += myChar;
				}
				else
				{
					var tempStr = splitStr;
					arr.push(tempStr);
					splitStr = "";
				}
			}	
			else
			{
				splitStr += myChar;
			}
		}
		
		if(splitStr != "")
		{ 
			arr.push(splitStr);
		}
		
		return arr;
	}
	
	Utils.stringToObject = function(str)
	{
		str = $.trim(str);
		
		var strLen = str.length,
			val = "",
			i = 0;
		
		if(strLen > 1)
		{
			if(str.charAt(0) == "[" && str.charAt(strLen - 1) == "]")
			{
				
				str = str.substr(1, str.length - 2);
				
				var arr = [],
					objStrs = Utils.objectSplit(str, ',');
					
				for(i = 0; i < objStrs.length; i++)
				{
					var objStr = $.trim(objStrs[i]);
					arr.push(Utils.stringToObject(objStr));
				}	
				
				val = arr;
			}
			else if(str.charAt(0) == "{" && str.charAt(strLen - 1) == "}")
			{
				str = str.substr(1, str.length - 2);
				
				
				var obj = {},
					objPairs = Utils.objectSplit(str, ';');
					
				for(i = 0; i < objPairs.length; i++)
				{
					var attr = objPairs[i].split(":"),
						prop = null,
						value = "";
						
					prop = Utils.hyphenToCamelCase($.trim(attr[0]));
						
					if(attr.length == 2)
					{
						value = Utils.stringToObject(attr[1]);
					}
					else if(attr.length > 2)
					{
						attr.splice(0, 1);
						value = Utils.stringToObject(attr.join(":"));
					}
					
					if(prop != "")
					{
						obj[prop] = value;	
					}
				}	
				
				val = obj;
			}
			else
			{
				val = Utils.getRealValue(str);
				
			}
		}
		else
		{
			val = Utils.getRealValue(str);
			
		}
		
		return val;
	}
	
	Utils.shuffleArray = function(array) 



	{
		var currentIndex = array.length, 
			temporaryValue,
			randomIndex;
		
		while (0 !== currentIndex) 
		{
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;
			
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}
		
		return array;
	}
	
	Utils.extendFrom = function (parent, child) 
	{
		child.prototype = (Object.create) ? Object.create(parent.prototype) : Utils.createObject(parent.prototype) ;
		return child.prototype;
	}
	
	Utils.createObject = function(proto) 
	{
		function o() { }
		o.prototype = proto;
		
		return new o();
	}
	
	Utils.isTouchDevice = function() 
	{
		return (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
	}
	
	Utils.outputCtr = 1;
	
	Utils.output = function(str, useConsole)
	{
		if(!useConsole)
		{
			$("#outputText").prepend(Utils.outputCtr + ":&nbsp;" + str + "<br>");
		}
		else
		{
			console.log(Utils.outputCtr + ": " + str);
		}
		
		Utils.outputCtr++;
	}
	
    Utils.initTooltip = function(tooltipElem, tooltipOptions)
	{
		tooltipOptions = tooltipOptions || {};
		tooltipOptions.theme = (tooltipOptions.theme != null) ? tooltipOptions.theme : "tooltipster-light";
		
		if($.fn.tooltipster != null)
		{
			var tooltips = tooltipElem ? $(tooltipElem).find("*[data-tooltip]").not(".tooltipstered") : $("*[data-tooltip]").not(".tooltipstered"),
				len = tooltips.length,
				i = 0,
				tempOptions = {};
			
			if(Utils.browser.name == "Firefox")
			{
				tempOptions.trigger = "hover";
			}
			else
			{
				tempOptions.trigger = "custom";
				tempOptions.triggerOpen = { mouseenter: true };
				tempOptions.triggerClose = { mouseleave: true };
			}
			
			tempOptions = $.extend({}, tempOptions, tooltipOptions);
			
			for(i = 0; i < len; i++)
			{
				var tooltip = tooltips.eq(i),
					combinedOptions = $.extend({}, tempOptions, Utils.stringToObject("{" + tooltip.data("tooltip-options") + "}"));
				
				tooltip.attr("title", tooltip.data("tooltip"));
				
				tooltip.tooltipster(combinedOptions);
				
				var tipHanlder = new Hammer(tooltip.get(0));
				
				tipHanlder.on('press pressup',  function (e)
												{
													var toolTipElem = $(e.target).closest(".tooltipstered");
					
													if(toolTipElem.length > 0)
													{
														if(e.type == "press")
														{
															toolTipElem.tooltipster('open');
														}
														else
														{
															toolTipElem.tooltipster('close');
														}
													}
												});
				
				
			}
			
			var tooltipHtmls = tooltipElem ? $(tooltipElem).find("*[data-tooltip-html]").not(".tooltipstered") : $("*[data-tooltip-html]").not(".tooltipstered"),
				tempHtmlOptions = { contentCloning:true };
			
			if(Utils.browser.name == "Firefox")
			{
				tempHtmlOptions.trigger = "hover";
			}
			else
			{
				tempHtmlOptions.trigger = "custom";
				tempHtmlOptions.triggerOpen = { mouseenter: true };
				tempHtmlOptions.triggerClose = { mouseleave: true };
			}
			
			tempHtmlOptions = $.extend({}, tempHtmlOptions, tooltipOptions);
			
			len = tooltipHtmls.length;
			
			for(i = 0; i < len; i++)
			{
				var tooltipHtml = tooltipHtmls.eq(i),
					combinedHtmlOptions = $.extend({}, tempHtmlOptions, Utils.stringToObject("{" + tooltipHtmls.data("tooltip-options") + "}"));
				
				tooltipHtml.attr("data-tooltip-content", tooltipHtml.attr("data-tooltip-html"));
				
				tooltipHtml.tooltipster(combinedHtmlOptions);
				
				var tipHtmlHanlder = new Hammer(tooltipHtml.get(0));
				tipHtmlHanlder.on('press pressup',  function (e)
												{
													var tooltipHtmlElem = $(e.target).closest(".tooltipstered");
					
													if(tooltipHtmlElem.length > 0)
													{
														if(e.type == "press")
														{
															$(e.target).tooltipster('open');
														}
														else
														{
															$(e.target).tooltipster('close');
														}
													}
												});
			}
		}
	}
    
    Utils.closeTooltip = function(elem)
    {
        if($.fn.tooltipster != null)
		{
            $(elem || ".tooltipstered").tooltipster("close");
        }
    }
    
    Utils.repositionTooltip = function(elem)
    {
        if($.fn.tooltipster != null)
		{
            $(elem || ".tooltipstered").tooltipster("reposition");
        }
    }
    
   window.Utils = Utils;
	
}(window, jQuery));


(function(window, $)
{
	
	var FullscreenElem = function(){};
	
	FullscreenElem.NAMESPACE = ".FullscreenElem"
	FullscreenElem.TOGGLE = "toggle" + FullscreenElem.NAMESPACE;
	FullscreenElem.KEY_EXIT = "keyexit" + FullscreenElem.NAMESPACE;
	FullscreenElem._vars = { fullscreenDiv:$("<div style='position:fixed; left:0px; top:0px; right:0px; bottom:0px; overflow:auto; z-index:99999'></div>"),
                             switchDiv:$("<div></div>"),
                             fullscreenDivCss:"fullscreenDiv",
                             isFullscreen:false,
                             bodyOverflow:$("body").css("overflow"),
                             bodyScrollLeft:0,
                             bodyScrollTop:0 };
		
	FullscreenElem._elem = null;
	
    FullscreenElem.isFullscreen = function(elem)
    {
       return $.contains(FullscreenElem._vars.fullscreenDiv[0], elem[0]);
    }
    
	FullscreenElem.toggleFullscreen = function(elem)
	{
		FullscreenElem.fullscreen(!FullscreenElem._vars.isFullscreen, elem);
	}
	
	FullscreenElem.fullscreen = function(enter, elem)
	{
        var f = FullscreenElem,
            fv = f._vars;
       
		if(jQuery.type(enter) === "boolean")
        {
			var oldElem = f._elem,
				curElem = $(elem),
				b = $("body"),
				w = $(window),
				isFullscreen = fv.isFullscreen,
				fullscreenDiv = fv.fullscreenDiv;
			
			if(enter && isFullscreen && !oldElem.is(curElem))
			{
				oldElem.removeClass(fv.fullscreenDivCss);
				fv.switchDiv.after(oldElem);
				fv.switchDiv.detach();
				
				curElem.after(fv.switchDiv);
				curElem.addClass(fv.fullscreenDivCss);
				fullscreenDiv.append(curElem);
				
				f._elem = curElem;
				fv.isFullscreen = true;
				$(FullscreenElem).triggerHandler({ type:FullscreenElem.TOGGLE, target:FullscreenElem });
			}
			else if(enter != isFullscreen)
			{
				if(enter)
				{
					if(oldElem == null && curElem.length > 0)
					{
						//ok	
						b.append(fullscreenDiv);
						fv.bodyOverflow = b.css("overflow");
						fv.bodyScrollLeft = w.scrollLeft();
                        fv.bodyScrollTop = w.scrollTop();
                        b.css("overflow", "hidden");
                        
                        curElem.after(fv.switchDiv);
                        curElem.addClass(fv.fullscreenDivCss);
                        fullscreenDiv.append(curElem);
						
						f._elem = curElem;
						fv.isFullscreen = true;
						$(FullscreenElem).triggerHandler({ type:FullscreenElem.TOGGLE, target:FullscreenElem });
					}
					else
					{
						//cancel	
						console.log("There is already an element in fullscreen or elem parameter is invalid.");
					}
				}
				else
				{
					if(oldElem != null && oldElem.is(curElem))
					{
						//ok
						curElem.removeClass(fv.fullscreenDivCss);
                        fv.switchDiv.after(curElem);
                        fv.switchDiv.detach();
                        fv.fullscreenDiv.detach();

						b.css("overflow", fv.bodyOverflow);
                        w.scrollLeft(fv.bodyScrollLeft);
						w.scrollTop(fv.bodyScrollTop);
                        
						//reset elem to null
						f._elem = null;
						fv.isFullscreen = false;
						$(FullscreenElem).triggerHandler({ type:FullscreenElem.TOGGLE, target:FullscreenElem });
					}
					else
					{
						//cancel	
						console.log("Cancel Exit because there is no active element in fullscreen or elem parameter is invalid");
					}
				}
			}
			/*
			else
			{
				console.log("Fullscreen state is not changed.");  
			}
			*/
        }

        return fv.isFullscreen;
	}
	
	
	$(document).keyup(function(e) 
    {
        if (e.keyCode == 27) 
        {
            if(FullscreenElem._elem != null)
            {
                var elem = FullscreenElem._elem;
                FullscreenElem.fullscreen(false, FullscreenElem._elem);

                $(FullscreenElem).triggerHandler({ type:FullscreenElem.KEY_EXIT, target:FullscreenElem, elem:elem });
            }
        }
    });
	
	
	window.FullscreenElem = FullscreenElem;
	
}(window, jQuery));


(function(window, $)
{
    "use strict";
	var BaseElem = function()
	{

		var o = this,
			jO = $(o);

		o._vars = {};

		o.vars = function(vars)
		{
			if(vars !== undefined)
			{
				//o._vars = $.extend(o._vars, vars);
				$.extend(o._vars, vars);

			}	

			return o._vars;
		}

		o.on = function()
		{
			jO.on.apply(jO, arguments);
		}

		o.one = function()
		{
			jO.one.apply(jO, arguments);
		}

		o.off = function()
		{
			jO.off.apply(jO, arguments);
		}

		o.data = function()
		{
			return jO.data.apply(jO, arguments);
		}

	},
	p = BaseElem.prototype;
		
	window.BaseElem = BaseElem;

}(window, jQuery));


 
(function(window, $)
{
	var ToggleElem = function(elemParam, varsParam)
	{
		parent.call(this);
		
		var o = this,
			_elem = null,
			_vars = o._vars,
			_super = {};
		
		_super.vars = o.vars;
		
		o.vars = function(varsParam, forceUpdate)
		{
			if(varsParam !== undefined)
			{
				_super.vars.call(o, varsParam);
				
				//if(forceUpdate)
				//{
					o.update();
				//}
			}
			
			return _vars;
		}
		
		o.elem = function(elemParam)
		{
			if(elemParam !== undefined)
			{
				if(_elem != null)
				{
					_elem.data("elemof", null);
				}
				
				_elem = null;
				_elem = $(elemParam);
				_elem.data("elemof", o);
				$(o).triggerHandler({ type:ToggleElem.ELEM_CHANGE, target:o });
				o.update();
			}
			
			return _elem;
		}
		
		o.toggle = function()
		{
			_vars.isEnabled = !_vars.isEnabled;
			o.update();
		}
		
		o.enabled = function(value, forceUpdate)
		{
			if(value != undefined)
			{
				if(value != _vars.isEnabled || forceUpdate)
				{
					_vars.isEnabled = value;
					o.update();	
				}
			}
            
			return _vars.isEnabled;
		}
		
		o.update = function()
		{
			if(_elem != null)
			{
				var cssObj = (_vars.isEnabled) ? _vars.onCss : _vars.offCss;
				TweenLite.to(_elem, _vars.animDuration, cssObj);
				$(o).triggerHandler({ type:ToggleElem.UPDATE, target:o });
			}
		}
		
		
		o.vars($.extend({ isEnabled:true, animDuration:0, onCss:{ autoAlpha:1, force3D:true }, offCss:{ autoAlpha:0.5, force3D:true } }, varsParam));
		
		o.elem(elemParam);
	},
	parent = BaseElem,
	p = Utils.extendFrom(parent, ToggleElem);
	
	p.constructor = ToggleElem;
	
	ToggleElem.NAMESPACE = ".toggleelem";
	ToggleElem.UPDATE = "update" + ToggleElem.NAMESPACE;
	ToggleElem.ELEM_CHANGE = "elemchange" + ToggleElem.NAMESPACE;
	window.ToggleElem = ToggleElem;
	
}(window, jQuery));


 
(function (window, $)
{
    "use strict";
	var AdaptiveImageLoader = function(elemsParam, varsParam)
	{
		parent.call(this);
		
		var o = this,
            jO = $(o),
            _queue = [],
			defaultVars = { loadDefaultOnFail:false, renameRule:"folder", adaptive:false, maxConnections:6 },
			_vars = o._vars,
            _scale = 1,
            _pauseLoad = true;
			
        o.append = function(elemsParam)
        {
            if(elemsParam !== undefined)
			{
				addToQueue(elemsParam, true);
			}
        }
        
        o.prepend = function(elemsParam)
        {
             if(elemsParam !== undefined)
			{
				addToQueue(elemsParam, false);
			}
        }
        
        o.empty = function()
        {
            _queue = [];
           // _queue = null;
            _pauseLoad = true;
        }
        
        o.load = function()
        {
            _pauseLoad = false;
			var queueLen = _queue.length;
			for(var i = 0; i < _vars.maxConnections; i++)
			{
				if(i < queueLen)
				{
					var image = _queue[i];
					if(!image.data("loading"))
					{
						image.data("loading", true);
						
						image.off("load", onImageLoad).off("error", onImageError).one("load", onImageLoad).one("error", onImageError).attr("src", image.data("url"));
					}
				}
				else
				{
					i = _vars.maxConnections;	
				}
			}
            
            if(queueLen == 0)
            {
                update();
            }
            
        }
        
        o.pause = function()
        {
            
        }
        
		o.vars($.extend({}, defaultVars, varsParam));
		o.append(elemsParam);
        
        function onImageLoad(e)
		{
			var index = queueIndexOf(e.target);
			
			if(index != -1)
			{	
				
				var image = _queue[index],
					originalElem = image.data("original"),
					retain = image.data("img");
				
				if(!retain)
				{
					var url = image.data("url");
						
                    originalElem[0].style.backgroundImage =  "url(" + url + ")";
					image.remove();
				}
				else
				{
                    image.removeData("url");
					image.removeData("loading");
					image.removeData("original");
					image.removeData("img");
					image.removeData("alturl");
					image = null;	
				}
				
				_queue.splice(index, 1);
				update();
				
				if(!_pauseLoad)
				{
					o.load();
				}
			}
		}
		
		function onImageError(e)
		{
			var index = queueIndexOf(e.target);
			
			if(index != -1)
			{	
				var image = _queue[index],
					altUrl = image.data("alturl"),
					imageUrl = image.data("url");
				
				if(_vars.loadDefaultOnFail && altUrl != "" && altUrl != imageUrl)
				{
					image.off("load", onImageLoad).off("error", onImageError).one("load", onImageLoad).one("error", onRetryImageError).attr("src", altUrl);
				}
				
				else
				{
					var retain = image.data("img");
					
					if(!retain)
					{
						image.remove();
					}
					else
					{
						image.removeData("url");
						image.removeData("loading");
						image.removeData("original");
						image.removeData("img");
						image.removeData("alturl");
						image = null;	
					}
					
					_queue.splice(index, 1);
					update();
				
					if(!_pauseLoad)
					{
						o.load();
					}
				}
			}
		}
		
		function onRetryImageError(e)
		{
			var index = queueIndexOf(e.target);
			
			if(index != -1)
			{	
				var image = _queue[index],
					retain = image.data("img");
				
				image.removeData("url");
				image.removeData("loading");
				image.removeData("original");
				image.removeData("img");
				image.removeData("alturl");
				
				if(!retain)
				{
					image.remove();
				}
				else
				{
					image = null;	
				}
					
				_queue.splice(index, 1);
				update();
				
				if(!_pauseLoad)
				{
					o.load();
				}
			}
		}
		
        function queueIndexOf(target)
		{
			var index = -1,
				target = $(target),
				queueLen = _queue.length;
			
			for(var i = 0; i < queueLen; i++)
			{
				var image = _queue[i];
				
				if(target.get(0) == image.get(0))
				{
					index = i;
					i = queueLen;
				}
			}
			
			return index;
		}
        
        function addToQueue(elemsParam, append)
        {
            
			AdaptiveImageLoader.allowCustomBreakpoints = false;
			
			AdaptiveImageLoader.setBreakpointIndex();
            
            elemsParam = $(elemsParam);
            var rootImg = getImage(elemsParam);
            
            if(rootImg != null)
            {
                if(append)
                {
                    _queue.push(rootImg);
                }
                else
                {
                    _queue.unshift(rootImg);   
                }
            }
            
            var elems = elemsParam.find("*[data-src]"),
                len = elems.length;
            
            for(var i = 0; i < len; i++)
            {
                var elemImg = getImage(elems.eq(i));
                
                if(elemImg != null)
                {
                     if(append)
                    {
                        _queue.push(elemImg);
                    }
                    else
                    {
                        _queue.unshift(elemImg);   
                    }  
                }
            }
        }
        
        function update()
		{
			 jO.triggerHandler({ type:AdaptiveImageLoader.PROGRESS, target:o });

			if(_queue != null && _queue.length == 0)
			{
				 jO.triggerHandler({ type:AdaptiveImageLoader.LOAD_COMPLETE, target:o });
			}	
		}
        
        function getImage(elem)
        {
            var img = null;
            if((elem.data("src") != null && elem.data("src") != ""))
            {
                var isImg = elem.is('img'),
                    hasBg = elem.css("background-img") != "none",
                    isAdaptive = ($.type(elem.data("adaptive")) === "boolean") ? elem.data("adaptive") : _vars.adaptive,
                    url = "",
                    altUrl = "";
                
                
                var dataSrc = Utils.stringToObject(elem.data("src")),
                    invalid = false;

                
                if($.isArray(dataSrc))
                {
                    if(dataSrc.length > 0)
                    {
                        var breakpointIndex = 0;
                        if(AdaptiveImageLoader.breakpointIndex >= 0 && AdaptiveImageLoader.breakpointIndex < dataSrc.length)
                        {
                            breakpointIndex = AdaptiveImageLoader.breakpointIndex;
                        }

                        url = dataSrc[breakpointIndex];

                        if(breakpointIndex != 0)
                        {
                            altUrl = dataSrc[0];
                        }

                        if(jQuery.type(url) != "string")
                        {
                            
                            invalid = true;
                        }
                    }
                    else
                    {
                        
                        invalid = true;
                    }
                }
                
                else if(isAdaptive)
                {
                    if(_vars.renameRule == "name")
                    {
                        var fileNameArr = dataSrc.split(".");
                        fileExt = fileNameArr.pop(),
                        baseName = fileNameArr.join(".");

                        url = baseName + "_" + AdaptiveImageLoader.breakpoints[AdaptiveImageLoader.breakpointIndex].name + "." + fileExt;
                    }
                    else
                    {
                        var dir = dataSrc.substring(0, dataSrc.lastIndexOf("/")),
                            fileName = dataSrc.substring(dataSrc.lastIndexOf("/") + 1, dataSrc.length)
                            url = (dir != "") ? dir + "/" + AdaptiveImageLoader.breakpoints[AdaptiveImageLoader.breakpointIndex].name  + "/" + fileName : AdaptiveImageLoader.breakpoints[AdaptiveImageLoader.breakpointIndex].name  + "/" + fileName;

                    }

                    altUrl = dataSrc;
                }
                else
                {
                    url = elem.data("src");
                }

                if(!invalid)
                {
                    elem.removeAttr("data-src");
                    elem.removeData("src");
               
                    if(isImg)
                    {
                        img = elem;
                        img.removeAttr("src");
                    }
                    else
                    {
                        img = $("<img/>");
                    }

                    img.data("url", url);
                    img.data("loading", false);
                    img.data("original", elem);
                    img.data("img", isImg);
                    img.data("alturl", altUrl);
                }
            }
            
            return img;
        }
        
	},
	parent = BaseElem,
	p = Utils.extendFrom(parent, AdaptiveImageLoader);
	
	p.constructor = AdaptiveImageLoader;
	
	AdaptiveImageLoader.NAMESPACE = ".AdaptiveImageLoader";
	AdaptiveImageLoader.LOAD_COMPLETE = "loadcomplete" + AdaptiveImageLoader.NAMESPACE;

	AdaptiveImageLoader.PROGRESS = "progress" + AdaptiveImageLoader.NAMESPACE;
	
	AdaptiveImageLoader.breakpoints = [{name:"small", breakpoint:480},
									   {name:"medium", breakpoint:960},
									   {name:"large", breakpoint:1280}];
    
	AdaptiveImageLoader.allowCustomBreakpoints = true;
	AdaptiveImageLoader.breakpointIndex = -1;
	
	AdaptiveImageLoader.sortBreakpoints = function()
	{
		AdaptiveImageLoader.breakpoints.sort(function(a,b) { return parseFloat(a.breakpoint) - parseFloat(b.breakpoint) } );
	}
	
	AdaptiveImageLoader.setCustomBreakpoints = function(breakpoints)
	{
		if(AdaptiveImageLoader.allowCustomBreakpoints)
		{
			
			if($.isArray(breakpoints) && breakpoints.length > 0)
			{
				
				var valid = true,
					len = breakpoints.length;
					
				for(var i = 0; i < len; i++)
				{
					var breakpoint = breakpoints[i];
					if(breakpoint.name == null || breakpoint.breakpoint == null || typeof breakpoint.name !== "string" || isNaN(breakpoint.breakpoint))
					{
						valid = false;
						i = len;
					}
				}
				
				if(valid)
				{
					AdaptiveImageLoader.breakpoints = null;
					AdaptiveImageLoader.breakpoints = breakpoints;
					
					AdaptiveImageLoader.sortBreakpoints(); 
					
				}
			}
		}
	}
	
	AdaptiveImageLoader.setBreakpointIndex = function()
	{
		
		if(AdaptiveImageLoader.breakpointIndex < 0)
		{ 
			if(window.screen != null)
			{
				var screenSize = Math.max(screen.width, screen.height);
				AdaptiveImageLoader.breakpointIndex = 0;
				for(var i = AdaptiveImageLoader.breakpoints.length - 1; i >= 0; i--)
				{
					var breakpoint = AdaptiveImageLoader.breakpoints[i];
					if(screenSize >= breakpoint.breakpoint)
					{
						AdaptiveImageLoader.breakpointIndex = i;
						i = -1;		
					}
				}
			}
			else
			{
				
				AdaptiveImageLoader.breakpointIndex = 0;
			}
		}
	}
    
    
	window.AdaptiveImageLoader = AdaptiveImageLoader;
	
}(window, jQuery));


 
(function(window, $)
{
    "use strict";
    var Marker = function(elemParam, varsParam)
	{
		parent.call(this, elemParam, varsParam);
		
		var o = this,
            jO = $(o),
			_elem = null,
			_vars = o._vars,
			_super = {},
            _zoom = 1,
            oldZoomVisible = false,
			zoomVisible = true;
			
		_super.vars = o.vars;
		
		o.vars = function(varsParam, forceUpdate)
		{
			if(varsParam !== undefined)
			{
				_super.vars.call(o, varsParam);
				
				if(forceUpdate)
				{
					o.update();
				}
			}
			
			return _vars;
		}
		
		o.elem = function(elemParam)
		{
			if(elemParam !== undefined)
			{
				if(_elem != null)
				{
					_elem.data("elemof", null);
				}
				
				_elem = null;
				_elem = $(elemParam);
				_elem.data("elemof", o);
				jO.triggerHandler({ type:Marker.ELEM_CHANGE, target:o });
				o.update();
			}
			
			return _elem;
		}
		
		o.update = function()
		{
			if(_elem != null)
			{
				zoomVisible = (_zoom >= _vars.minZoom && _zoom <= _vars.maxZoom);
				var cssObj = (zoomVisible) ? { autoAlpha:1 } : { autoAlpha:0 };
				cssObj.x = _vars.x;
				cssObj.y = _vars.y;
				cssObj.transformOrigin = _vars.transformOrigin;
				cssObj.force3D = (_vars.force3D === true);
				cssObj.backfaceVisibility = "hidden";

				if(!_vars.preserveScale)
				{
					cssObj.scale = 1;
				}

			   TweenLite.set(_elem, cssObj);
				jO.triggerHandler({ type:Marker.UPDATE, target:o });
			}
		}
		
		o.zoom = function(curZoom, baseZoom, actualZoom, duration)
		{
			
            if(_elem != null && curZoom !== undefined)
            {
				duration = duration || 0;
            	baseZoom = baseZoom || 1;
			
            	_zoom = _vars.useRealZoom ? (curZoom * baseZoom) : curZoom;
				
				if(_vars.preserveScale)
				{
            		TweenLite.to(_elem, duration, {scale:1 / (curZoom * baseZoom)});
				}
            	setZoomVisibility();
            }
            
            return _zoom;
		}
		
		o.vars($.extend({ x:0, y:0, transformOrigin:"50% 50%", minZoom:0, maxZoom:999, preserveScale:true, useRealZoom:false, force3D:false }, varsParam));
		o.elem(elemParam);
        setZoomVisibility(true);
        
        function setZoomVisibility(forceUpdate)
        {
            zoomVisible = (_zoom >= _vars.minZoom && _zoom <= _vars.maxZoom);
            setVisibility(forceUpdate);
        }
        
        function setVisibility(forceUpdate)
        {
            forceUpdate = forceUpdate || false;
            if(_elem != null && (oldZoomVisible != zoomVisible || forceUpdate))
            {
                var cssObj = zoomVisible ? { autoAlpha:1 } : { autoAlpha:0 };
                TweenLite.set(_elem, cssObj);
				
				oldZoomVisible = zoomVisible;
                jO.triggerHandler({ type:Marker.UPDATE, target:o });
            }
        }
        
	},
	parent = BaseElem,
	p = Utils.extendFrom(parent, Marker);
	
	p.constructor = Marker;
	
	Marker.NAMESPACE = ".marker";
	Marker.UPDATE = "update" + Marker.NAMESPACE;
	Marker.ELEM_CHANGE = "elemchange" + Marker.NAMESPACE;
	window.Marker = Marker;
	
}(window, jQuery));


(function(window, $)
{
    "use strict";
	var ElemZoomer = function(elemHolderParam, elemParam, markersParam, varsParam)
	{
		parent.call(this);
		
		var o = this,
			jO = $(o),
			_vars = o._vars,
			_super = {},
			_elemHolder = null,
			_elem = null,
			_markers = [],
			inputHandler = null,
			multiPointer = (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 1) || !isNaN(navigator.maxTouchPoints),
			transformOrigin = "0px 0px",
			oldX = 0,
			oldY = 0,
			curX = 0,
			curY = 0,
			overDragX = 0,
			overDragY = 0,
			curZoom = 1,
			endZoom = 1,
			baseZoom = 1,
			ratioX = 0,
			ratioY = 0,
			centerX = 0,
			centerY = 0,
			startClientX = 0,
			startClientY = 0,
			curClientX = 0,
			curClientY = 0,
			oldClientX = 0,
			oldClientY = 0,
			oldWidth = 0,
			oldHeight = 0,
			curWidth = 0,
			curHeight = 0,
			elemWidth = 0,
			elemHeight = 0,
			oldElemWidth = 0,
			oldElemHeight = 0,
			elemLeft = 0,
			elemTop = 0,
			elemPosX = 0,
			elemPosY = 0,
			originalElemPosX = 0,
			originalElemPosY = 0,
			holderWidth = 0,
			holderHeight = 0,
            oldHolderWidth = 0,
            oldHolderHeight = 0,
			NO_GESTURE = 0,
			DRAG_GESTURE = 1,
			PINCH_GESTURE = 2,
			curTouchAction = "",
			panTouchAction = "pan-x pan-y",
			curAxis = null,
			zoomComplete = true,
            resizeTweenObj = {},
			scrollTop = 0,
			scrollLeft = 0,
			initMouseWheel = false,
			elemHolderOverflow = "",
			preventScroll = true,
			preventScrollObj = {},
			smartMinZoom = 1,
			startMouseOver = false,
			mouseMove = false, 
			mouseObj = {}, 
			mouseNewX = 0, 
			mouseNewY = 0,
			touchInput = false,
            isBuggySamsung = (navigator.userAgent.indexOf("SamsungBrowser/9.0") != -1),
            enableDrag = false;
        
		_super.vars = o.vars;
		
        o._tempMinZoom = 1;
        o._prevGesture = NO_GESTURE;
			
        o.elemHolder = function(newElemHolder)
        {
            if(newElemHolder !== undefined)
            {
                if(_elemHolder == null || _elemHolder[0] != $(newElemHolder)[0])
				{
                 
                    _elemHolder = $(newElemHolder).eq(0);
					elemHolderOverflow = _elemHolder.css("overflow");
					
					if(_vars.crop)
					{
						TweenLite.set(_elemHolder, {overflow:"hidden"});
					}
					
                    if(_elem != null)
                    {
                        _elemHolder.append(_elem);
						o.resetElem(true, true);
                    }
					
					setupHoverZoom();
					
                    jO.triggerHandler({ type:ElemZoomer.ELEM_HOLDER_CHANGE, target:o });
                }
            }
            
            return _elemHolder;
        }
        
		o.elem = function(newElem, removeOld)
		{
			if(newElem != null)
			{
				if(_elemHolder != null && (_elem == null || !$.contains(_elemHolder[0], $(newElem)[0])))
				{
					if(_elem != null)
					{
                        
                        disableTouchInput();
                        _elem.off("wheel", onMouseWheel);
						
						if(removeOld)
						{
                            _elem.remove();
						}
						else
						{
							if($.contains(_elemHolder[0], _elem[0]))
							{
								_elem.detach();		
							}
						}
					}
					
					_elem = $(newElem).eq(0);
					_elemHolder.append(_elem);
					
					o.resetElem(true, true);
                    
                    setupTouchInput();
					setupHoverZoom();
                    
					if(_vars.allowMouseWheelZoom && !_vars.disableInput)
					{
						_elem.on("wheel", onMouseWheel);
					}
                    
					jO.triggerHandler({ type:ElemZoomer.ELEM_CHANGE, target:o });
				}
			}
			
			return _elem;
		}
		
		o.markers = function(newMarkers, removeOld)
		{
            if(_elem != null && newMarkers != undefined)
			{
                o.removeMarkers(removeOld);
                o.addMarkers(newMarkers);
			}
			
			return _markers;
		}
        
        o.addMarkers = function(newMarkers)
		{
			
			if(_elem != null && newMarkers != undefined)
			{
				var newMarkersLen = newMarkers.length;
				for(var i = 0; i < newMarkersLen; i++)
				{
					var newMarker = newMarkers[i];

					if(!_elem.is("img"))
					{
					   _elem.append(newMarker.elem());
						var markerInputHandler = new Hammer(newMarker.elem()[0]);
						markerInputHandler.on("tap", onMarkerTap);
					   _markers.push(newMarker);
					}
				}

				if(curZoom >= o._tempMinZoom)
				{
                    o.zoom(curZoom, 0);
				}

				Utils.initTooltip(_elem, _vars.tooltipOptions);
			}
			
		}
        
        o.removeMarkers = function(removeOld)
        {
            var markersLen = _markers.length;
            for(var i = markersLen - 1; i >= 0; i--)
            {
                o.removeMarker(i, removeOld);
            }   
            
            _markers = [];
        }
		
		
		o.removeMarker = function(markerIndex, removeOld)
        {
			var markersLen = _markers.length;

			if(markerIndex >= 0 && markerIndex < markersLen)
			{
				var marker = _markers[markerIndex];
				if(removeOld)
				{	
					marker.elem().remove();
				}

				marker = null;
				_markers.splice(markerIndex, 1)
			}
        }
		
        
		o.vars = function(varsParam)
		{
			if(varsParam !== undefined)
			{
				var oldMinZoom = o._tempMinZoom,
					oldMaxZoom = _vars.maxZoom,
					isFullscreen = (o.elem() != null) ? FullscreenElem.isFullscreen(o.elem()) : false,
					oldScaleMode = !isFullscreen ? _vars.scaleMode : _vars.fullscreenScaleMode ;
				
				_super.vars.call(o, varsParam);
				
				if(_elemHolder != null)
				{
					if(_vars.crop)
					{
						TweenLite.set(_elemHolder, {overflow:"hidden"});
					}
					else
					{
						TweenLite.set(_elemHolder, {overflow:elemHolderOverflow});
					}
				}
				
				if(_elem != null)
				{
					_elem.off("wheel", onMouseWheel);
					
					if(_vars.allowMouseWheelZoom && !_vars.disableInput)
					{
						_elem.on("wheel", onMouseWheel);
					}
				}
				
                o.resetElem(true);
                
                setupHoverZoom();
                
                disableTouchInput();
                setupTouchInput();
			}
			
			return _vars;
		}
        
        function disableTouchInput()
        {
            if(inputHandler != null)
            {
                inputHandler.stop(true);	
                inputHandler.destroy();	
                inputHandler = null;
            }
        }
        
        function setupTouchInput()
        {
            if(_elem != null && !_vars.disableInput)
            {
                setDefaultTouchAction();

                inputHandler = new Hammer.Manager(_elem[0], {touchAction:multiPointer ? panTouchAction : "compute"});
                inputHandler.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );

                inputHandler.on("hammer.input", onInput);
                inputHandler.on("doubletap", onDoubleTap);
            }
        }
        
		function setupHoverZoom()
		{
            if(_elem != null && !_vars.disableInput)
			{
				_elem.off("mouseenter", onMouseEnter);
				_elemHolder.off("mousemove", onMouseMove);
				_elemHolder.off("mouseleave", onMouseLeave);
				TweenLite.set(_elem, { cursor:"pointer" });

				if(_vars.allowHoverZoom)
				{
					_elem.on("mouseenter", onMouseEnter);
					_elemHolder.on("mousemove", onMouseMove);
					_elemHolder.on("mouseleave", onMouseLeave);
					TweenLite.set(_elem, { cursor:"zoom-in" });
				}
			}
		}
		
        function setResizeCheck()
        {
            o.resetElem();
            if(_vars.resizeDuration != -1)
            {
                TweenLite.to(resizeTweenObj, _vars.resizeDuration, { onComplete:setResizeCheck } );
            }
            else
            {
                TweenLite.killTweensOf(resizeTweenObj);
            }
        }
        
		o.baseZoom = function()
		{
			return baseZoom;
		}
		
		o.zoom = function(value, duration)
		{
			if(value !== undefined)
			{
				var tempZoom = value,
                    tempMaxZoom = _vars.maxZoom,
                    tempZoomPointX,
                    tempZoomPointY;
                
                tempZoomPointX = _vars.zoomPointX;
                tempZoomPointY = _vars.zoomPointY;
                
				if(tempZoom > tempMaxZoom)
				{
					tempZoom = tempMaxZoom;
					
				}
				else if(tempZoom < o._tempMinZoom)
				{
					tempZoom = o._tempMinZoom;
				}
				
				if(_vars.allowZoom)
				{
					if(zoomComplete)
					{
						updateElemPos();
					}
					
					oldX = curX;
					oldY = curY; 
					
                    centerX = (elemWidth * baseZoom * o._tempMinZoom * tempZoomPointX) - curX;
					centerY = (elemHeight * baseZoom * o._tempMinZoom * tempZoomPointY) - curY;
					
                    oldWidth = curWidth;
					oldHeight = curHeight;
					
					setZoomPosition(tempZoom);
					adjustPosition();
					zoomComplete = false;
                    handleZoom(duration);
					
					endZoom = curZoom;
				}
			}
			
			return curZoom;
		}
		
		o.zoomIn = function(duration)
		{
            o.zoom(curZoom + _vars.zoomStep, duration);
		}
		
		o.zoomOut = function(duration)
		{
            o.zoom(curZoom - _vars.zoomStep, duration);
		}
		
		o.x = function(value, duration)
		{
			if(value !== undefined)
			{
				curX = value;
				adjustPosition(true);
				handleDrag(duration);
			}
			
			return curX;
		}
		
		o.y = function(value, duration)
		{
			if(value !== undefined)
			{
				curY = value;
				adjustPosition(true);
				handleDrag(duration);
			}
			
			return curY;
		}
		
		o.transform = function (transformObj, duration, fromDrag)
		{
			if(transformObj != null)
			{
				duration = !isNaN(duration) ? duration : _vars.animDuration;
				curX = !isNaN(transformObj.x) ? transformObj.x : curX;
				curY = !isNaN(transformObj.y) ? transformObj.y : curY;
				curZoom = transformObj.zoom || curZoom;
				//setZoomPosition(curZoom);
				
				curWidth = elemWidth * baseZoom * curZoom;
				curHeight = elemHeight * baseZoom * curZoom;
				
				adjustPosition(fromDrag);
				
				handleZoom(duration);
				endZoom = curZoom;
			}
		}
		
		o.move = function(xVal, yVal, duration, fromDrag)
		{
			if(xVal != null && yVal != null)
			{
				curX = xVal;
				curY = yVal;
				adjustPosition(fromDrag);
				
				handleDrag(duration);
			}
		}
		
		o.moveLeft = function(duration)
		{
			o.x(curX - vars.dragStep, duration);
		}
		
		o.moveRight = function(duration)
		{
			o.x(curX + vars.dragStep, duration);
		}
		
		o.moveUp = function(duration)
		{
			o.y(curY - vars.dragStep, duration);
		}
		
		o.moveDown = function(duration)
		{
			o.y(curY + vars.dragStep, duration);
		}
		
		
		o.zoomToMarker = function(markerTarget, zoomLevel, duration)
		{
			if(markerTarget != null)
			{
				markerTarget = (markerTarget instanceof jQuery) ? markerTarget : $(markerTarget);
				zoomLevel = (!isNaN(zoomLevel)) ? zoomLevel : (curZoom <= o._tempMinZoom) ? _vars.doubleTapZoom : curZoom;
				duration = !isNaN(duration) ? duration : _vars.animDuration;
				
                for(var i = 0; i < _markers.length; i++)
				{
					var marker = _markers[i],
						markerElem = marker.elem();

					if(markerTarget.closest(markerElem).length > 0 || markerTarget.is(markerElem)) 
					{
						var markerVars = marker.vars(),
							xVal = -((markerVars.x * zoomLevel * baseZoom) - (holderWidth * 0.5) + elemLeft) ,
							yVal = -((markerVars.y * zoomLevel * baseZoom) - (holderHeight * 0.5) + elemTop) ;
						
						o.transform({zoom:zoomLevel, x:xVal, y:yVal}, duration, false);
						
						i = _markers.length;
					}
				}
			}
		}
		
		o.zoomToCenter = function(pointObj, zoomLevel, duration)
		{
			if(pointObj != null)
			{
				zoomLevel =  zoomLevel || curZoom;
				duration = !isNaN(duration) ? duration : 0;
				
				var xVal = -((pointObj.x * zoomLevel * baseZoom) - (holderWidth * 0.5) + elemLeft) ,
					yVal = -((pointObj.y * zoomLevel * baseZoom) - (holderHeight * 0.5) + elemTop) ;
					
				o.transform({zoom:zoomLevel, x:xVal, y:yVal}, duration);
			}
		}
	
		o.resetElem = function(forceReset, useInit)
		{
            forceReset = (forceReset === true);
            useInit = (useInit === true);
            
			if(_elem != null)
            {
                
				var bgImg = _elemHolder.find("*[data-elem='bg']").eq(0),
					isFullscreen = FullscreenElem.isFullscreen(_elem),
					tempAdjustWidth = isFullscreen ? _vars.fullscreenAdjustWidth : _vars.adjustWidth,
					tempAdjustHeight = isFullscreen ? _vars.fullscreenAdjustHeight : _vars.adjustHeight;
				
				if(bgImg.length > 0)
				{
					if(bgImg.is("img"))
					{
						elemWidth = bgImg[0].naturalWidth;
						elemHeight = bgImg[0].naturalHeight;
					}
					else
					{
						elemWidth = bgImg.width();
						elemHeight = bgImg.height();	
					}
					
					TweenLite.set(_elem, { width:elemWidth, height:elemHeight });
				}
				else
				{
					elemWidth = _elem.width();
               		elemHeight = _elem.height();
				}
				
				holderWidth = _elemHolder.width() + tempAdjustWidth;
                holderHeight = _elemHolder.height() + tempAdjustHeight;
				
				if(forceReset || holderWidth != oldHolderWidth || holderHeight != oldHolderHeight ||
                   elemWidth != oldElemWidth || elemHeight != oldElemHeight)
                {
					var oldZoom = useInit ? 1 : curZoom,
						smartZoom = 1;
					
					oldWidth = curWidth;
                    oldHeight = curHeight;
					oldX = useInit ? 0 : curX;
                    oldY = useInit ? 0 : curY;
					curX = 0;
                    curY = 0;
                    zoomComplete = true;
					
					if(elemWidth > 0 && elemHeight > 0)
                    {
						
						var widthRatio = holderWidth / elemWidth,
                            heightRatio = holderHeight / elemHeight,
							//tempScaleMode = (_vars.fullscreenScaleMode != null && isFullscreen) ? _vars.fullscreenScaleMode : _vars.scaleMode,
							tempScaleMode = (isFullscreen) ? _vars.fullscreenScaleMode : _vars.scaleMode,
							tempAdjustHolderSize = isFullscreen ? false : _vars.adjustHolderSize,
							tempAdjustLeft = isFullscreen ? _vars.fullscreenAdjustLeft : _vars.adjustLeft,
							tempAdjustTop = isFullscreen ? _vars.fullscreenAdjustTop : _vars.adjustTop,
                            tempInitZoom = (useInit && tempScaleMode != "smart") ? _vars.initZoom : 1;

						
						if(tempScaleMode == "widthOnly")
                        {
                            baseZoom = widthRatio;
                        }
                        else if(tempScaleMode == "heightOnly")
                        {
                            baseZoom = heightRatio;
                        }
                        else if(tempScaleMode == "proportionalInside")
                        {
							var elemRatio = elemHeight / elemWidth,
                                 parentRatio = holderHeight / holderWidth;

                            if (elemRatio > parentRatio) 
                            {
                                baseZoom = heightRatio;
                            }
                            else
                            {
                                baseZoom = widthRatio;
                            }
                        }
                        else if(tempScaleMode == "proportionalOutside")
                        {
                             var elemRatio = elemHeight / elemWidth,
                                 parentRatio = holderHeight / holderWidth;

                            if (elemRatio > parentRatio) 
                            {
                                baseZoom = widthRatio;
                            }
                            else
                            {
                                baseZoom = heightRatio;
                            }
                        }
						else if(tempScaleMode == "smart")
                        {
                           
							if(elemWidth > holderWidth || elemHeight > holderHeight)
							{	
								var elemRatio = elemHeight / elemWidth,
									parentRatio = holderHeight / holderWidth;

								if (elemRatio > parentRatio) 
								{
									baseZoom = 1;
									smartMinZoom = heightRatio;
                                    smartZoom = holderHeight / oldHolderHeight;
								}
								else
								{
									baseZoom = 1;
									smartMinZoom = widthRatio; 
                                    smartZoom = holderWidth / oldHolderWidth;
								}
							}
							else
							{
								baseZoom = 1;	
							}
                        }
						else
						{
							baseZoom = 1;	
						}
						
						curWidth = (elemWidth * baseZoom) >> 0;
                        curHeight = (elemHeight * baseZoom) >> 0;
					
						if(_elemHolder != null && tempAdjustHolderSize)
						{
							if(tempScaleMode == "widthOnly")
							{
								holderHeight = curHeight;
								TweenLite.set(_elemHolder, { height:curHeight });
								
							}
							else if(tempScaleMode == "heightOnly")
							{
								holderWidth = curWidth;
								TweenLite.set(_elemHolder, { width:curWidth });
							}
						}
						
						o._tempMinZoom = (tempScaleMode == "smart") ? smartMinZoom : _vars.minZoom;
                        o._tempMinZoom = Math.round(o._tempMinZoom * 100000) / 100000; 
                        
                        var sizeMult = o._tempMinZoom * tempInitZoom;
                        
                        if((curWidth * sizeMult) < holderWidth)
                        {
                            elemLeft = 	(holderWidth - (curWidth * sizeMult)) * 0.5;
                        }
                        else
                        {
                            elemLeft = 	(holderWidth - (curWidth * sizeMult)) * _vars.initX;	
                        }

                        if((curHeight * sizeMult) < holderHeight)
                        {
                            elemTop = (holderHeight - (curHeight * sizeMult)) * 0.5;
                        }
                        else
                        {
                            elemTop = (holderHeight - (curHeight * sizeMult)) * _vars.initY;
                        }
                        
                        oldZoom = (useInit && tempScaleMode == "smart") ? o._tempMinZoom : oldZoom;
                        curZoom = (_vars.adjustSmartZoom) ? oldZoom * smartZoom * tempInitZoom : oldZoom * tempInitZoom;
						
                        var tempMaxZoom = _vars.maxZoom;
						if(curZoom > tempMaxZoom)
						{
							curZoom = tempMaxZoom;
						}
						else if(curZoom < o._tempMinZoom)
						{
							curZoom = o._tempMinZoom;
						}
						
                        curZoom = Math.round(curZoom * 100000) / 100000; 
                        endZoom = curZoom;
                        
                        curWidth = (elemWidth * baseZoom * curZoom) >> 0;
						curHeight = (elemHeight * baseZoom * curZoom) >> 0;
						
						curX = ((oldX / oldWidth) * curWidth);
						curY = ((oldY / oldHeight) * curHeight);
						
						if(isNaN(curX))
						{
							curX = 0;
						}
						
						if(isNaN(curY))
						{
							curY = 0;
						}
                        
                        adjustPosition();
                        
                        TweenLite.to(_elem, 0, {left:elemLeft + tempAdjustLeft, top:elemTop + tempAdjustTop, right:"auto", bottom:"auto", x:curX, y:curY, scale:baseZoom * curZoom, transformOrigin:transformOrigin, position:"absolute", immediateRender:false });
						
                        setDefaultTouchAction();
                        setTouchAction(panTouchAction);

                        updateElemPos();
                        originalElemPosX = elemPosX;
                        originalElemPosY = elemPosY;
							
                        handleMarkerZoom(0);
                    }
                }
                
                oldHolderWidth = holderWidth;
                oldHolderHeight = holderHeight;
                oldElemWidth = elemWidth;
                oldElemHeight = elemHeight;
				
				initMouseWheel = false;
            }
		}
		
		o.vars($.extend({}, ElemZoomer.defaultVars, varsParam));
        o.elemHolder(elemHolderParam);
		o.elem(elemParam);
        o.markers(markersParam);
        
        $(window).resize(o.resetElem);
		
		function onMarkerTap(e)
		{
			if(_vars.zoomToMarker)
			{
				var target = $(e.target);
				o.zoomToMarker(target);
			}
		}
		
		function setTouchAction(value)
		{
			if(multiPointer && value != curTouchAction)
			{
				curTouchAction = value;
				if(_elem != null)
				{
					TweenLite.set(_elem, { touchAction:curTouchAction });
				}
			}
		}
		
		function setDefaultTouchAction()
		{
			if(multiPointer)
			{
				if(curZoom > o._tempMinZoom || curWidth > holderWidth || curHeight > holderHeight || (_vars.handleOverDragX && _vars.handleOverDragY))
				{
					panTouchAction = "none";
				}
				else if(_vars.handleOverDragX)
				{
					panTouchAction = "pan-y";	
				}
				else if(_vars.handleOverDragY)
				{
					panTouchAction = "pan-x";	
				}
                else
                {
                    panTouchAction = "pan-x pan-y";
                }
			}
		}
		
		function onDoubleTap(e)
		{
            if(zoomComplete && !mouseMove)
			{
				var tempZoom = endZoom,
					resetCenter = false;
				
				if(tempZoom >= _vars.doubleTapZoom || tempZoom >= _vars.maxZoom)
				{
					tempZoom = _vars.minZoom;
					resetCenter = true;
				}
				else
				{
					tempZoom  = _vars.doubleTapZoom;
				}
				
				var tempMaxZoom = _vars.maxZoom;
				if(tempZoom > tempMaxZoom)
				{
					tempZoom = tempMaxZoom;
					
				}
				else if(tempZoom < o._tempMinZoom)
				{
					tempZoom = o._tempMinZoom;
				}
				
				if(_vars.allowZoom && _vars.allowDoubleTapZoom)
				{
					if(zoomComplete)
					{
						updateElemPos();
					}
					
					oldX = curX;
					oldY = curY; 
				
					var center = e.center;
					centerX = center.x - elemPosX - curX;
					centerY = center.y - elemPosY - curY;
					
					oldWidth = curWidth;
					oldHeight = curHeight;
					
					setZoomPosition(tempZoom);
					adjustPosition(false, resetCenter);
					zoomComplete = false;
					handleZoom();
					
					endZoom = curZoom;
					
				}
			}
			
			e.srcEvent.preventDefault();
		}
		
		function preserveZoom(zoom)
		{
			if(zoom > 0)
			{
				oldX = curX;
				oldY = curY; 

				centerX = (holderWidth * 0.5) - curX;
				centerY = (holderHeight * 0.5) - curY;

				oldWidth = curWidth;
				oldHeight = curHeight;

				setZoomPosition(zoom);
				adjustPosition();
				zoomComplete = false;
				handleZoom(0);

				endZoom = curZoom;
			}
		}
		
		function onMouseWheel(e)
		{
			var delta = -e.originalEvent.deltaY;
			
			preventScroll = false;
			
			if(o._prevGesture == NO_GESTURE && _vars.allowZoom && _vars.allowMouseWheelZoom && !_vars.allowHoverZoom)
			{
				if(zoomComplete || !initMouseWheel)
				{
					updateElemPos();
					initMouseWheel = true;
				}
				
				var tempZoom = endZoom,
					tempMaxZoom = _vars.maxZoom;
				
				if(delta > 0)
				{
					if(tempZoom < tempMaxZoom)
					{
						preventScroll = true;
					}
					else
					{
						preventScroll = false;
					}
					
					tempZoom += _vars.zoomStep;
				}
				else
				{
					if(tempZoom > o._tempMinZoom)
					{
						preventScroll = true;
					}
					else
					{
						preventScroll = false;
					}
					
					tempZoom -= _vars.zoomStep;
				}
				
				
				
				if(tempZoom > tempMaxZoom)
				{
					tempZoom = tempMaxZoom;
					
				}
				else if(tempZoom < o._tempMinZoom)
				{
					tempZoom = o._tempMinZoom;
				}
				
				
                oldX = curX;
                oldY = curY; 

                centerX = e.originalEvent.clientX - elemPosX - curX;
                centerY = e.originalEvent.clientY - elemPosY - curY;

                oldWidth = curWidth;
                oldHeight = curHeight;

                setZoomPosition(tempZoom);
                adjustPosition();
                zoomComplete = false;
                handleZoom();

                endZoom = curZoom;
                    
			}
			
			var isFF = Utils.browser.name == "Firefox";
			
			if(preventScroll || !_vars.allowMouseWheelScroll)
			{
				e.originalEvent.preventDefault();
			}
			else if(isFF && _vars.overrideFFScroll)
			{
				var scrollTarget = $(_vars.scrollTarget);
				if(scrollTarget.length != 0)
				{
					var sTop = scrollTarget.scrollTop();
					
                    if(delta > 0)
					{
						sTop -= 100;	
					}
					else
					{
						sTop += 100;		
					}
					
					if(window.ScrollToPlugin)
					{
						TweenLite.to(scrollTarget, _vars.scrollDuration, { scrollTo:{ y:sTop } });
					}
					else
					{
						scrollTarget.scrollTop(sTop);
					}
				}
				
				e.originalEvent.preventDefault();
			}
		}
		
		function onInput(e)
		{
            if(e.pointers.length == 1)
			{
                if(_vars.allowDrag && !mouseMove && zoomComplete)
				{	
					if(o._prevGesture != DRAG_GESTURE)
					{
                        enableDrag = false;
                        endZoom = curZoom;
						oldWidth = curWidth;
						oldHeight = curHeight;
						oldX = curX;
						oldY = curY;
						overDragX = 0;
						overDragY = 0;
						curAxis = null;

						startClientX = e.pointers[0].clientX >> 0;
						startClientY = e.pointers[0].clientY >> 0;

						var scrollTarget = $(_vars.scrollTarget);
						if(scrollTarget.length != 0)
						{
							scrollTop = scrollTarget.scrollTop();
							scrollLeft = scrollTarget.scrollLeft();
						}

						if(e.pointerType == "mouse" || curWidth > holderWidth || curHeight > holderHeight || (_vars.handleOverDragX && _vars.handleOverDragY))
						{
							e.srcEvent.preventDefault();
						}
					}
					else
					{
                        curClientX = e.pointers[0].clientX >> 0;
						curClientY = e.pointers[0].clientY >> 0;

						var deltaX = curClientX - startClientX,
							deltaY = curClientY - startClientY,
							asbDeltaX = Math.abs(deltaX),

							asbDeltaY = Math.abs(deltaY);

						if(curAxis == "x")
						{
							deltaY = 0;	
							asbDeltaY = 0;
						}
						else if(curAxis == "y")
						{
							deltaX = 0;	
							asbDeltaX = 0;	
						}

						
                        if(enableDrag || asbDeltaX >= 5 || asbDeltaY >= 5)
                        {
                            curX = oldX + deltaX;
                            curY = oldY + deltaY;

                            adjustPosition(true);
                            handleDrag(0);
                            enableDrag = true;
                        }
                        
						if(endZoom > o._tempMinZoom || curWidth > holderWidth || curHeight > holderHeight || (_vars.handleOverDragX && _vars.handleOverDragY))
						{
							e.srcEvent.preventDefault();
						}
						else if(_vars.handleOverDragX != _vars.handleOverDragY)
						{
							if(asbDeltaX > asbDeltaY)
							{
								if(curAxis == null)
								{
									curAxis = "x";	
								}

								if(_vars.handleOverDragX)
								{
									e.srcEvent.preventDefault();
								}
							}
							else if(asbDeltaY > asbDeltaX)
							{
								if(curAxis == null)
								{
									curAxis = "y";	
								}
								if(_vars.handleOverDragY)
								{
									e.srcEvent.preventDefault();
								}
							}
						}
					}

					if(e.isFirst)
					{
                        if(e.pointerType != "mouse")
						{
							touchInput = true;
						}
						jO.triggerHandler({ type:ElemZoomer.GESTURE_START, target:o });
					}
					else if(e.isFinal)
					{
                        oldX = curX;
						oldY = curY;
						o._prevGesture = NO_GESTURE;
						
						jO.triggerHandler({ type:ElemZoomer.GESTURE_END, target:o });
					}
					else
					{
						o._prevGesture = DRAG_GESTURE;
					}
				}
				else if(mouseMove)
				{
					e.srcEvent.preventDefault();
				}
				else
				{
					if(e.isFinal)
					{
                        o._prevGesture = NO_GESTURE;
						TweenLite.to(mouseObj, 0.1, { onComplete:endTouchInput });
						jO.triggerHandler({ type:ElemZoomer.GESTURE_END, target:o });
					}
					
				}
			}
			else if (e.pointers.length > 1)
			{
                if(o._prevGesture == NO_GESTURE)
                {
                    endZoom = curZoom;
                    oldWidth = curWidth;
                    oldHeight = curHeight;
                    oldX = curX;
                    oldY = curY;
                }
                
                if(_vars.allowZoom && _vars.allowPinchZoom)
				{
                    if(o._prevGesture != PINCH_GESTURE)
					{
						updateElemPos();
						
						var center = e.center;
						
						centerX = center.x - elemPosX - oldX;
						centerY = center.y - elemPosY - oldY;
						oldWidth = curWidth;
						oldHeight = curHeight;
						oldX = curX;
						oldY = curY;
					}
					else
					{
						setZoomPosition(endZoom * e.scale)
						adjustPosition();
                        zoomComplete = false;
						handleZoom();
					}
					o._prevGesture = PINCH_GESTURE;
					
                    if(e.isFinal)
					{
                        oldX = curX;
						oldY = curY;
						o._prevGesture = NO_GESTURE;
						jO.triggerHandler({ type:ElemZoomer.GESTURE_END, target:o });
					}
                    
                    e.srcEvent.preventDefault();
                    setTouchAction("none");
				}
               
			}
            else
            {
                if(e.isFinal)
				{
                    oldX = curX;
                    oldY = curY;
                    o._prevGesture = NO_GESTURE;
                    jO.triggerHandler({ type:ElemZoomer.GESTURE_END, target:o });
				}
            }
			
            setDefaultTouchAction();
            setTouchAction(panTouchAction);
            /*
			if(endZoom > o._tempMinZoom || curWidth > holderWidth || curHeight > holderHeight || (_vars.handleOverDragX && _vars.handleOverDragY))
			{
				setTouchAction("none");
			}
			else
			{
				setTouchAction(panTouchAction);
			}
            */
            jO.triggerHandler({ type:ElemZoomer.INPUT, target:o, hammerEvent:e });
		}
		
		function endTouchInput()
		{
			touchInput = false;
		}
		
		function setZoomPosition(value)
		{
			curZoom = value;
			
			var tempMaxZoom = _vars.maxZoom;
			if(curZoom > tempMaxZoom)
			{
				curZoom = tempMaxZoom;
			}
			else if(curZoom < o._tempMinZoom)
			{
				curZoom = o._tempMinZoom;
			}
			
			curWidth = (elemWidth * baseZoom * curZoom) >> 0;
			curHeight = (elemHeight * baseZoom * curZoom) >> 0;
			
			ratioX = centerX / oldWidth;
			ratioY = centerY / oldHeight; 
			
			curX = oldX - ((curWidth - oldWidth) * ratioX);
			curY = oldY - ((curHeight - oldHeight) * ratioY);	
		}
		
		function adjustPosition(fromDrag, resetCenter)
		{
			var tempCurX = curX,
				tempCurY = curY,
				zoomMult = baseZoom * curZoom,
				tempCurWidth = elemWidth * zoomMult,
				tempCurHeight = elemHeight * zoomMult;
			
			resetCenter = resetCenter || false;
			
			if(_vars.allowCenterDrag && !resetCenter && curZoom > o._tempMinZoom && !mouseMove)
			{
				if(curX > -elemLeft + (holderWidth * 0.5))
				{
					curX = -elemLeft + (holderWidth * 0.5);
				}
				else if(curX + curWidth < (holderWidth * 0.5) - elemLeft)
				{
					curX = (holderWidth * 0.5) - curWidth - elemLeft;
				}

				
				if(curY > -elemTop + (holderHeight * 0.5))
				{
					curY = -elemTop + (holderHeight * 0.5);
				}
				else if(curY + curHeight < (holderHeight * 0.5) - elemTop)
				{
					curY = (holderHeight * 0.5) - curHeight - elemTop;
				}
			}
			else
			{
				if(tempCurWidth <= holderWidth)
				{
					curX = ((holderWidth - tempCurWidth) * 0.5) - elemLeft;
				}
				else if(curX > -elemLeft)
				{
					curX = -elemLeft;
				}
				else if(curX + tempCurWidth < holderWidth - elemLeft)
				{
					curX = holderWidth - tempCurWidth - elemLeft;
				}

				if(tempCurHeight <= holderHeight)
				{
					curY = ((holderHeight - tempCurHeight) * 0.5) - elemTop;
				}
				else if(curY > -elemTop)
				{
					curY = -elemTop;
				}
				else if(curY + tempCurHeight < holderHeight - elemTop)
				{
					curY = holderHeight - tempCurHeight - elemTop;
				}
			}	
			
			if(fromDrag)
			{
				overDragX = curX - tempCurX;
				overDragY = curY - tempCurY;
				
				var scrollTarget = $(_vars.scrollTarget);
				
				if(endZoom > o._tempMinZoom && scrollTarget.length != 0)
				{
					
					if(_vars.scrollOnOverDragX && overDragX != 0)
					{
						if(window.ScrollToPlugin)
						{
							TweenLite.to(scrollTarget, _vars.scrollDuration, { scrollTo:{ x:scrollLeft + overDragX } });
						}
						else
						{
							scrollTarget.scrollLeft(scrollLeft + overDragX);
						}
					}
					
					if(_vars.scrollOnOverDragY && overDragY != 0)
					{
						if(window.ScrollToPlugin)
						{
							TweenLite.to(scrollTarget, _vars.scrollDuration, { scrollTo:{ y:scrollTop + overDragY } });
						}
						else
						{
							scrollTarget.scrollTop(scrollTop + overDragY);
						}
					}
				}
				
				if(_vars.handleOverDragX && curX != tempCurX)
				{
					jO.triggerHandler({ type:ElemZoomer.OVER_DRAG_X, 

											    x:overDragX, 
												target:o });
				}
				
				if(_vars.handleOverDragY && curY != tempCurY )
				{
					jO.triggerHandler({ type:ElemZoomer.OVER_DRAG_Y, 
										   		y:overDragY, 
												target:o });
				}
			}
		}
		
		function onZoomComplete()
		{
			zoomComplete = true;
			if(_elem != null)
			{
                TweenLite.set(_elem, {imageRendering: "auto", rotation:0});
                if(isBuggySamsung)
                {
                    handleMarkerZoom();
                }
			}
		}
        
        function handleZoom(duration)
		{
			if(_elem != null)
			{
                curZoom = Math.round(curZoom * 100000) / 100000;
				duration = !isNaN(duration) ? duration : _vars.animDuration;
				
                var zoom = curZoom * baseZoom,
					zoomObj = { scale:zoom, x:curX, y:curY, force3D:_vars.force3D, backfaceVisibility:"hidden", imageRendering: "-webkit-optimize-contrast", rotation:0.01, immediateRender:false, onComplete:onZoomComplete };

                if(_vars.tooltipVisibility == "autohide")
                {
                    Utils.closeTooltip();
                }
                else if(_vars.tooltipVisibility == "autoposition")
                {
                    zoomObj.onUpdate = Utils.repositionTooltip;
                }
                
				TweenLite.to(_elem, duration, zoomObj);
                
                if(!isBuggySamsung)
                {    
                    handleMarkerZoom(duration);
                }
               
                jO.triggerHandler({ type:ElemZoomer.ZOOM, 
											x:curX,
											y:curY, 
											zoom:curZoom, 
											target:o });	
			}
		}
        
        function handleMarkerZoom(duration)
        {
            if(_markers.length > 0)
			{
				duration = !isNaN(duration) ? duration : _vars.animDuration;
                
				var actualZoom = 1 / curZoom;
                for(var i = 0; i < _markers.length; i++)
                {
                    var marker = _markers[i];
                    
                    marker.zoom(curZoom, baseZoom, actualZoom, duration); 
					
                }
			}
        }
		
		function handleDrag(duration)
		{
			if(_elem != null)
			{
				duration = !isNaN(duration) ? duration : _vars.animDuration;

				TweenLite.to(_elem, duration, { transformOrigin:transformOrigin, x:curX, y:curY, force3D:_vars.force3D, backfaceVisibility:"hidden"});	
				if(_vars.tooltipVisibility == "autohide")
                {
                    var deltaX = Math.abs(curClientX - startClientX),
                        deltaY = Math.abs(curClientY - startClientY);
                    
                    if(deltaX > 5 || deltaY > 5 )
                    {
                        Utils.closeTooltip();
                    }
                }
                else if(_vars.tooltipVisibility == "autoposition")
                {
                    Utils.repositionTooltip();
                }
                
				jO.triggerHandler({ type:ElemZoomer.DRAG, 
											x:curX,
											y:curY, 
											target:o });	
			}
		}
		
		function updateElemPos()
		{
			if(_elem != null)
			{
				var clientRect = _elem[0].getBoundingClientRect();
				elemPosX = clientRect.left - curX;
				elemPosY = clientRect.top - curY;
			}
		}
		
		
		function onMouseEnter(e)
		{
            if(!touchInput && !mouseMove)
			{
				TweenLite.to(mouseObj, 0.1, { onComplete:setMouseMove });
			}
		}

		function setMouseMove()
		{
            if(_vars.allowZoom && _vars.allowHoverZoom)
			{
				var tempZoom = _vars.hoverZoom || 2;
				mouseMove = true;
				o.transform( { zoom:tempZoom, x:-mouseNewX, y:-mouseNewY }, _vars.animDuration);
			}
		}
		
		function onMouseMove(e)
		{
			if(_vars.allowZoom && _vars.allowHoverZoom && !touchInput)
			{
				var clientRect = _elemHolder[0].getBoundingClientRect(),
					tempElemPosX = clientRect.left,
					tempElemPosY = clientRect.top,
					tempZoom = _vars.hoverZoom || 2,
					centerX = e.clientX - tempElemPosX - _vars.hoverOffset,
					centerY = e.clientY - tempElemPosY - _vars.hoverOffset,
					newX = (centerX / (holderWidth - (_vars.hoverOffset * 2))) * holderWidth,
					newY = (centerY / (holderHeight - (_vars.hoverOffset * 2))) * holderHeight;

				if(mouseMove)
				{	
					o.transform( { zoom:tempZoom, x:-newX - elemLeft, y:-newY }, _vars.animDuration);
				}
				else
				{
					mouseNewX = newX;
					mouseNewY = newY;
				}
				
			}	
			
			e.preventDefault();
			
		}

		function onMouseLeave(e)
		{
			TweenLite.to(mouseObj, 0.15, { onComplete:disableMouseMove });
			zoomComplete = false;
            o.zoom(_vars.minZoom, _vars.animDuration);
			mouseMove = false;
		}
		
		function disableMouseMove()
		{
			if(_vars.allowZoom && _vars.allowHoverZoom && o._prevGesture == NO_GESTURE)
			{
				zoomComplete = false;
				mouseMove = false;
                o.zoom(_vars.minZoom, _vars.animDuration);
			}
		}
	},
	parent = BaseElem,
	p = Utils.extendFrom(parent, ElemZoomer);
	
	p.constructor = ElemZoomer;
	
	ElemZoomer.defaultVars = { animDuration:0.25, crop:true, minZoom:1, maxZoom:2, scaleMode:"widthOnly", adjustHolderSize:true, ease:Power4.easeOut, allowZoom:true, allowPinchZoom:true, allowMouseWheelZoom:true, allowMouseWheelScroll:false, allowDoubleTapZoom:true, doubleTapZoom:2, dragStep:10, zoomStep:0.5, initX:0.5, initY:0.0, zoomPointX:0.5, zoomPointY:0.5, adjustWidth:0, adjustHeight:0, resizeDuration:-1, handleOverDragX:false, handleOverDragY:false, force3D:false, scrollOnOverDragX:false, scrollOnOverDragY:false, scrollTarget:window, fullscreenScaleMode:"proportionalInside", fullscreenAdjustWidth:0, fullscreenAdjustHeight:0, overrideFFScroll:false, scrollDuration:0.25, tooltipOptions:{}, adjustLeft:0, adjustTop:0, fullscreenAdjustLeft:0, fullscreenAdjustTop:0, allowDrag:true, allowCenterDrag:false, zoomToMarker:false, adjustSmartZoom:true, allowHoverZoom:false, hoverZoom:2, hoverOffset:40, disableInput:false, tooltipVisibility:"none", initZoom:1 };
	
	ElemZoomer.NAMESPACE = ".elemzoomer";
	ElemZoomer.ELEM_HOLDER_CHANGE = "elemholderchange" + ElemZoomer.NAMESPACE;
	ElemZoomer.ELEM_CHANGE = "elemchange" + ElemZoomer.NAMESPACE;
	ElemZoomer.OVER_DRAG_X = "overdragx" + ElemZoomer.NAMESPACE;
	ElemZoomer.OVER_DRAG_Y = "overdragy" + ElemZoomer.NAMESPACE;
	ElemZoomer.DRAG = "drag" + ElemZoomer.NAMESPACE;
	ElemZoomer.ZOOM = "zoom" + ElemZoomer.NAMESPACE;
	ElemZoomer.GESTURE_START = "gesturestart" + ElemZoomer.NAMESPACE;
	ElemZoomer.GESTURE_END = "gestureend" + ElemZoomer.NAMESPACE;
	ElemZoomer.INPUT = "input" + ElemZoomer.NAMESPACE;
	
	window.ElemZoomer = ElemZoomer;
	
}(window, jQuery));
 
(function(window, $)
{
    "use strict";
	var PinchZoomer = function(elemParam, varsParam, parseControlsParam)
	{
		var pzObj = PinchZoomer.parseElem(elemParam, null, varsParam, parseControlsParam);
		
		parent.call(this, $(elemParam).parent(), pzObj.elem, pzObj.markers, pzObj.vars);
		
		var o = this,
			jO = $(o),
			_vars = o._vars,
			_elem = null,
			_super = {},
			_controls = {},
			_showMarkers = true,
            preloaderDiv = $("<div style='position:absolute; left:0px; top:0px; right:0px; bottom:0px; background-position:center center; background-repeat:no-repeat'></div>"), 
			realScaleMode = _vars.scaleMode,
            realAdjustHolderSize = _vars.adjustHolderSize,
            body = $("body"),
            imageLoader = null,
            hasLoadSetup = false,
            hasInitZoom = false;
		
        _super.elem = o.elem;
		
		PinchZoomer.objs.push(this);
		
		PinchZoomer.triggerHandler({ type:PinchZoomer.ADD, target:o });
		
		o.controls = function(controlsParam)
		{
			if(controlsParam !== undefined)
			{
                _controls.controlHolder = controlsParam.controlHolder;
				for(var i = 0; i < PinchZoomer.BUTTON_CONTROL_NAMES.length; i++)
				{
					var controlName = PinchZoomer.BUTTON_CONTROL_NAMES[i];
					if(controlsParam[controlName])
					{
						if(_controls[controlName])
						{
							_controls[controlName].elem().off("click" + PinchZoomer.NAMESPACE, o[controlName]);
							_controls[controlName] = null;
						}
						_controls[controlName] = controlsParam[controlName];
						
						var controlElem = _controls[controlName].elem();
						controlElem.off("click" + PinchZoomer.NAMESPACE, o[controlName]).on("click" + PinchZoomer.NAMESPACE, o[controlName]);
					}
				}
				
				onZoom(true);
			}
			
			return _controls;
		}
		
        
		o.fullscreen = function(value)
		{
            var elemHolder = o.elemHolder();
            
            if($.type(value) === "boolean")
            {
                FullscreenElem.fullscreen(value, o.elemHolder());
                onFullscreenToggle();
				//o.resetElem(true);
			 	jO.triggerHandler({ type:PinchZoomer.FULLSCREEN_TOGGLE, target:o });
            }
            
            return elemHolder != null && FullscreenElem.isFullscreen(elemHolder);
		}
		
		o.fullscreenToggle = function()
		{
            o.fullscreen(!o.fullscreen());
		}
		
        o.load = function()
        {
           if(imageLoader != null)
           {
			   TweenLite.delayedCall(0.1, imageLoader.load);   
           }
        }
		
		o.elem = function(elem, removeOld, parseControls, overwriteVars)
		{
			var elemParent = o.elemHolder(),
				obj = PinchZoomer.parseElem(elem, elemParent, overwriteVars ? o.vars() : PinchZoomer.defaultVars, parseControls);
				
			_elem = _super.elem(obj.elem, removeOld);
			o.vars(obj.vars);
			o.markers(obj.markers);
			//o.resetElem(true, true);
			
			if(parseControls)
			{
				o.controls(obj.controls);
			}
			
			return _elem;
		}
		
		o.id = function()
		{
			return _vars.id;
		}
		
		o.controls(pzObj.controls);
		o.on(PinchZoomer.ZOOM, onZoom);
		o.on(PinchZoomer.ELEM_CHANGE, onElemChange);
        o.on(PinchZoomer.ELEM_HOLDER_CHANGE, onElemHolderChange);
        
		onElemChange();
		onElemHolderChange();
		onFullscreenToggle();
		onZoom(true);
		
		$(FullscreenElem).on(FullscreenElem.KEY_EXIT, onFullscreenElemKeyExit);
		jO.triggerHandler({ type:PinchZoomer.INIT, target:o });
		
		/****** Private Functions ******/
        
        function onElemChange()
        {
            hasLoadSetup = false;
            setupLoader(); 
            
            if(_vars.preload)
            {
                o.load();
            }
        }
        
        function onElemHolderChange()
        {
            var hasControlHolder = (_controls.controlHolder != null && _controls.controlHolder.length == 1),

                elemHolder = o.elemHolder();
            
            if(hasControlHolder)
            {
                elemHolder.append(_controls.controlHolder);
            }
            
            for(var i = 0; i < PinchZoomer.BUTTON_CONTROL_NAMES.length; i++)
			{
				var controlName = PinchZoomer.BUTTON_CONTROL_NAMES[i],
					controlElem = _controls[controlName];
				
                if(hasControlHolder)
                {
                    if(controlElem.elem().parent()[0] != _controls.controlHolder[0])
                    {
                       elemHolder.append(controlElem);
                    }
                }
			}
        }
        
        function setupLoader()
        {
			if(!hasLoadSetup)
            {
                //var elem = o.elem();
                if(window.AdaptiveImageLoader !== undefined)
                {

                    var elem = o.elem(),
                        elemHolder = o.elemHolder();

					if(elem != null)
					{
						TweenLite.set(elem, { alpha:0 });
						if(_vars.preloaderUrl != null && _vars.preloaderUrl != "")
						{
							preloaderDiv[0].style.backgroundImage =  "url(" + _vars.preloaderUrl + ")";
						}

						elemHolder.append(preloaderDiv);
						if(imageLoader != null)
						{
							imageLoader.off(AdaptiveImageLoader.LOAD_COMPLETE, onImagesLoaded);
							imageLoader.empty();
						}

						imageLoader = null;
						imageLoader = new AdaptiveImageLoader(elem, _vars.imageLoaderOptions);					

						imageLoader.one(AdaptiveImageLoader.LOAD_COMPLETE, onImagesLoaded);
					}
                }
                
                hasLoadSetup = true;
            }
        }
        
        function onImagesLoaded()
        {
			preloaderDiv.detach();  
            o.resetElem(true, true);
			var elem = o.elem();
			if(elem != null)
			{	
				TweenLite.to(elem, _vars.animDuration, { alpha:1 });
                
                if(_vars.initFullscreen)
                {    
                    o.fullscreen(_vars.initFullscreen);
                }
                /*
                if(o.vars().scaleMode != "smart")
                {	
                    o.zoom(_vars.initZoom, 0, true);
                }
                else
                {
                    o.zoom(o._tempMinZoom, 0);
                }
                */
				jO.triggerHandler({ type:PinchZoomer.LOAD_COMPLETE, target:o });
			}
        }
        
		function onFullscreenElemKeyExit(e)
		{
			if(o.elem() != null)
			{
				if($.contains(e.elem[0], o.elem()[0]))
				{
					//o.resetElem();
					onFullscreenToggle();
				}
			}
		}
		
		
		function onZoom(forceUpdate)
		{
			forceUpdate = $.type(forceUpdate) === "boolean" ? forceUpdate : false;
			var zoom = o.zoom();
			
			if(_controls.zoomIn)
			{
				var enableZoomIn = false,
					tempMaxZoom = _vars.maxZoom;
				
				if(zoom < tempMaxZoom)
				{
					enableZoomIn = true;
				}
				
				_controls.zoomIn.enabled(enableZoomIn, forceUpdate);
			}
			
			if(_controls.zoomOut)
			{
				var enableZoomOut = false;
				if(zoom > o._tempMinZoom)
				{
					enableZoomOut = true;
				}
				
				_controls.zoomOut.enabled(enableZoomOut, forceUpdate);
			}
		}
        
        function onScreenFullToggle()
        {
           jO.triggerHandler({ type:PinchZoomer.FULLSCREEN_TOGGLE, target:o });
        }
        
        function onFullscreenToggle()
        {
            if(_controls.fullscreenToggle)
            {
                var fs = o.fullscreen();
                _controls.fullscreenToggle.enabled(FullscreenElem.isFullscreen(o.elemHolder()), true);
				
				// o.resetElem(true);
				if(_vars.fullscreenScaleMode != _vars.scaleMode)
				{
					o.resetElem(true, true);
                    
					o.zoom(o._tempMinZoom, 0);
				}
				else if(_vars.fullscreenScaleMode == "smart" && _vars.scaleMode == "smart" && o.zoom() == o._tempMinZoom)
				{
					o.resetElem(true);
					o.zoom(o._tempMinZoom, 0);
				}
            }   
        }
		
		function onMarkersToggle()
		{
			if(_controls.markerToggle)
			{
				_controls.markerToggle.enabled(_showMarkers);
			}
		}
		
	},
	parent = ElemZoomer,
	p = Utils.extendFrom(parent, PinchZoomer);
	
	p.constructor = PinchZoomer;
	
	for (var prop in parent) 
	{
    	PinchZoomer[prop] = ElemZoomer[prop];
	}
	
	PinchZoomer.defaultVars = $.extend({}, ElemZoomer.defaultVars, { appendControls:true, appendControlHolder:true, fullscreenDivCss:"fullscreenDiv", fullscreenScaleMode:"proportionalInside", preloaderUrl:"assets/preloader.gif", preload:true, initFullscreen:false });
	
	PinchZoomer.BUTTON_CONTROL_NAMES = ["zoomIn", "zoomOut", "fullscreenToggle"];
	PinchZoomer.DEFAULT_TRANSFORM_ORIGIN = "50% 50%"
	PinchZoomer.FULLSCREEN_TOGGLE = "fullscreenToggle" + PinchZoomer.NAMESPACE;
	PinchZoomer.LOAD_COMPLETE = "loadcomplete" + PinchZoomer.NAMESPACE;
	PinchZoomer.ADD = "add" + PinchZoomer.NAMESPACE;
	PinchZoomer.INIT = "init" + PinchZoomer.NAMESPACE;
	
	PinchZoomer.objs = [];
	PinchZoomer._lastId = 1;
	PinchZoomer.transformPresets = [];
	PinchZoomer._transformPresetLastId = 1;
    PinchZoomer.jO = $({}); 
	
	
    PinchZoomer.getTransformOrigin = function(idOrIndex)
	{
		var transformOrigin = PinchZoomer.DEFAULT_TRANSFORM_ORIGIN;
		
		if(!isNaN(idOrIndex))
		{
			if(idOrIndex >= 0 && idOrIndex < PinchZoomer.transformPresets.length)
			{
				transformOrigin = PinchZoomer.transformPresets[idOrIndex].transformOrigin;	
			}
		}
		else
		{
			for(var i = 0; i < PinchZoomer.transformPresets.length; i++)
			{
				var transformPreset = PinchZoomer.transformPresets[i];
				
				if(idOrIndex == transformPreset.id)
				{
					transformOrigin = transformPreset.transformOrigin;	
					i = PinchZoomer.transformPresets.length;
				}
			}
		}
		
		return transformOrigin;
	}
	
	PinchZoomer.parseElem = function(elem, elemParent, vars, parseControls)
	{
		elem = $(elem).eq(0);
		elemParent = (elemParent != undefined) ? $(elemParent) : elem.parent();
		
		var obj = {},
			elemVars = {},
			markers = [],
			controls = {},
			i;
			
		if(elem.length == 1 && elemParent.length == 1)
		{
			parseControls = ($.type(parseControls) === "boolean") ? parseControls : true;
			var markerElems = elem.find("*[data-elem='marker']"),
				pzId = elem.attr("id") || "pz" + PinchZoomer._lastId;
				
			PinchZoomer._lastId++;
			
			elemVars = $.extend({}, {id:pzId}, PinchZoomer.defaultVars, vars, Utils.stringToObject("{" + elem.data("options") + "}"));
			
			if(window.Marker !== undefined)
			{
				var markersLen = markerElems.length;
				for(i = 0; i < markersLen; i++)
				{
					var markerElem = markerElems.eq(i),
						markerVars = Utils.stringToObject("{" + markerElem.data("options") + "}");
					
					if(markerVars.transformOrigin != null && isNaN(markerVars.transformOrigin.charAt(0)))
					{
						markerVars.transformOrigin = PinchZoomer.getTransformOrigin(markerVars.transformOrigin);
					}
					
					var marker = new Marker(markerElem, markerVars);
					markers.push(marker);
				}
				
			}
			
			if(parseControls && window.ToggleElem  !== undefined)
			{
				controls.controlHolder = elemParent.find("*[data-elem='controlHolder']").eq(0);
				
				if(elemVars.appendControlHolder && controls.controlHolder.length == 0)
				{
					controls.controlHolder = $("<div class='controlHolder' data-elem='controlHolder'></div>");
					elemParent.append(controls.controlHolder);
				}
			
				for(i = 0; i < PinchZoomer.BUTTON_CONTROL_NAMES.length; i++)
				{
					var controlName = PinchZoomer.BUTTON_CONTROL_NAMES[i],
						controlElem = elemParent.find("*[data-elem='" + controlName + "']"),
						defaultVars = { onCss:{ className:controlName + " on" }, offCss:{ className:controlName + " off" } },
						controlVars = {};
						
				   	if(controlElem.length == 0)
					{
						if(elemVars.appendControls)
						{
							controlElem = $("<div class='" + controlName + "'></div>");
							controls[controlName] = new ToggleElem(controlElem, defaultVars);
							
							if(controls.controlHolder.length == 0)
							{
								controlVars = defaultVars;
								elemParent.append(controlElem);
							}
							else
							{
								controls.controlHolder.append(controlElem);
							}
						}
					}
					else
					{
						controlElem = controlElem.eq(0);
						controlVars = Utils.stringToObject("{" + controlElem.data("options") + "}");
						controls[controlName] = new ToggleElem(controlElem, defaultVars);
					}
				}
			}
			
			obj.elem = elem;
			obj.vars = elemVars;
			obj.markers = markers;
			obj.controls = controls;
		}
		
		return obj;
	}
	
	PinchZoomer.get = function(idOrIndex)
	{
		var len = PinchZoomer.objs.length,
			pzObj = null;

		if(!isNaN(idOrIndex))
		{
			if(idOrIndex >= 0 && idOrIndex < len)
			{
				pzObj = PinchZoomer.objs[idOrIndex];
			}
		}
		else
		{
			for(var i = 0; i < len; i++)
			{
				var pz = PinchZoomer.objs[i];
				if(pz.id() == idOrIndex)
				{
					pzObj = pz;	
					i = len;
				}
			}
		}
		
		return pzObj;
	}
	
	PinchZoomer.remove = function(idOrIndex)
	{
		var index = -1,
			len = PinchZoomer.objs.length;
			
		if(!isNaN(idOrIndex))
		{
			index = idOrIndex;
		}
		else
		{
			for(var i = 0; i < len; i++)
			{
				if(PinchZoomer.objs[i].id() == idOrIndex)
				{
					index = i;
					i = len;
				}
			}
		}
		
		if(index >= 0 && index < len)
		{
			var pz = PinchZoomer.objs[index],
				elem = pz.elem(),
				elemHolder = pz.elemHolder();
			
			if(pz.fullscreen())
			{
				pz.fullscreen(false);	
			}
			
			if(elem != null)
			{
				elem.remove();
				elemHolder.remove();
			}
			
			elem = null;
			PinchZoomer.objs[index] = null;
			PinchZoomer.objs.splice(index, 1);
		}
	}
	
	PinchZoomer.init = function(elemsParam, varsParam, parseControlsParam)
	{
		var i = 0, 
			j = 0,
			transformPresetElems = $("*[data-elem='transformPreset']"),
            imageLoaderOptions = {};
			
        if(window.AdaptiveImageLoader !== undefined)
        {

            var imageLoaderElem = $("*[data-elem='imageloader']");
            if(imageLoaderElem.length != 0)
            {
                imageLoaderOptions = Utils.stringToObject("{" + imageLoaderElem.eq(0).data("options") + "}");
            }

            var breakpointElem = $("*[data-elem='breakpoints']");
            if(breakpointElem.length != 0)
            {
                AdaptiveImageLoader.setCustomBreakpoints(Utils.stringToObject("[" + breakpointElem.eq(0).data("value") +"]"));
            }

            imageLoaderElem.remove();
            breakpointElem.remove();
        }
			
		for(i = 0; i < transformPresetElems.length; i++)
		{
			var transformPresetElem = transformPresetElems.eq(i),
				transformPreset = $.extend({id:"transformPreset" + PinchZoomer._transformPresetLastId, transformOrigin:PinchZoomer.DEFAULT_TRANSFORM_ORIGIN}, Utils.stringToObject("{" + transformPresetElem.data("options") + "}"));
				
			PinchZoomer.transformPresets.push(transformPreset);
			PinchZoomer._transformPresetLastId++;
			
			transformPresetElem.removeAttr("data-elem");
			transformPresetElem.removeAttr("data-options");
		}
		
		var elems = $(elemsParam || "*[data-elem='pinchzoomer']"),
			elemsLen = elems.length;
			
		for(i = 0; i < elemsLen; i++)
		{
			var elem = elems.eq(i),
				pz = new PinchZoomer(elem, varsParam, parseControlsParam);
		}
	}
	
	
	PinchZoomer.on = function()
	{
		PinchZoomer.jO.on.apply(PinchZoomer.jO, arguments);
	}

	PinchZoomer.one = function()
	{
		PinchZoomer.jO.one.apply(PinchZoomer.jO, arguments);
	}

	PinchZoomer.off = function()
	{
		PinchZoomer.jO.off.apply(PinchZoomer.jO, arguments);
	}
	
	PinchZoomer.triggerHandler = function()
	{
		$(PinchZoomer.eventObj).triggerHandler.apply(PinchZoomer.jO, arguments);
	}
	
	window.PinchZoomer = PinchZoomer;
	
}(window, jQuery));

(function ($) 
{
	$.fn.pinchzoomer = function(_vars, parseControls) 
	{
		PinchZoomer.init(this, _vars, parseControls);
		
		return this;
	};
	
}(jQuery));

(function($)
{
	$(onReady);
	
	function onReady()
	{
		PinchZoomer.init();
		$(document).on('contextmenu', onContextMenu);
	}
	
	function onContextMenu(e) 
	{
		for(var i = 0; i < PinchZoomer.objs.length; i++)
    	{
			var pz = PinchZoomer.objs[i];
			
			if (pz.elem != null && $.contains(pz.elem()[0], $(e.target)[0]))
			{
				i = PinchZoomer.objs.length;
				return false;
			}
		}
  	}
	
}(jQuery));