/* 
 * partify -  A framework for development of Web applications 
 *          partitioned in different communicating devices.
 * http://www.partify.org/
 * Copyright (C) 2014  Simeon Ivaylov Petrov, Alessio Bellino, Flavio De Paoli
 * 
 * This file is part of partify.
 * 
 * partify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * partify is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/agpl-3.0.html.
*/

;
(function($) {

    $.fn.partify = function(options) {
	
	    //partifyButton obj
	    var partifyButton = $(this);
	    var partifyButtonId = "#" + partifyButton.attr("id");

	    //all available events
	    var events = {
		"partify":    ["newVc", "connVc", "changeLayout", "triggerVcEvent", "rmVcClient", "rmVc"],
		"keyboard": ["keydown", "keypress", "keyup"],
		"mouse":    ["click", "dblclick",
			     "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup"],
		"touch":    ["hold",
			     "tap", "doubletap",
			     "drag", "dragstart", "dragend", "dragup", "dragdown", "dragleft", "dragright",
			     "swipe", "swipeup", "swipedown", "swipeleft", "swiperight",
			     "transform", "transformstart", "transformend",
			     "rotate",
			     "pinch", "pinchin", "pinchout",
			     "touch",
			     "release"],
		"custom":   []
	    };

	    //default parameters 
	    var defaults = {
		"ip": "",
		"port": "",
                "debug": false,
                "stateful": false,
                "connVcInterval": 500,
                "connVcTimeout": 10000,
		"onInit": function(){},
		"onDestroy": function(){},
		"onWindowShow": function(){},
		"onWindowHide": function(){},
		"onMultiDeviceMode": function(){},
		"onMonoDeviceMode": function(){},
		"onWarning": function(statusCode){},
		"onWsOpen": function(ev){},
		"onWsMessage": function(ev){},
		"onWsError": function(ev){},
		"onWsClose": function(statusCode, ev){},
                "html": {
                    "connectButton": "Connect device",
                    "disconnectButton": "Disconnect device",
                    "window": {
                        "header": {
                            "title": "Connect device",
                            "close": "Close"
                        },
                        "content": {
                            "layoutsLabel": "Select layout",
                            "vcLabel": "Your ID",
                            "loadingImgPath": "../../src/img/loading.gif",
                            "connectVcLabel": "Connect to another ID",
                            "connectVcButton": "Connect",
                            "warningBackButton": "Try again",
                            "warningMessages": {
                                "1006":    "Server connection failed<br/>Please try again later<br/>(check: server activity, server ip, server port, firewall outbound rules, client origin)",
                                "7000":    "The virtual channel does not exist",
                                "7001":    "You are allready conncetd to this virtual channel<br/>Try again",
                                "7002":    "There is no available virtual channel<br/>Please try again later",
                                "7003":    "The virtual channel is full<br/>Please try again later",
                                "7004":    "The virtual channel for current IP is full<br/>Please try again later",
                                "7005":    "The virtual channel is currently busy<br/>Please try again later",
                                "7006":    "The virtual channel for current layout is full<br/>Please try again later"
                            }
                        }
                    }
                },
		"devices":{
		    "smartphone":{
			"minWidth": 320,
			"maxWidth": 568
		    },
		    "tablet":{
			"minWidth": 569,
			"maxWidth": 1024
		    },
		    "desktop":{
			"minWidth": 1025,
			"maxWidth": 4096
		    }
		},
                "components": {},
		"layouts": {}
	    };

	    //global vars
            
            //override defaults with user parameters
            var opts = $.extend(true, {}, defaults, options);
            
	    var device = {};
            var nameSpace = "partify";
            
            var
            opts,
	    ws,
	    wsMessage,
	    device,
	    layout,
	    eventsAffectedComponents,
	    vcId,
            clientId,
            monoDeviceMode,
            multiDeviceMode,
            appMode,
            firstConnVcOccurred,
            statusCodeOk,
	    nameSpace,
	    firstConnVcFailed,
	    timeConnVcFail,
	    timeFirtsConnVcFail;

	    _init();
            
	    //private functions
	    function _init() {
                _initGlobalVars();
		_initDevices();
                _initComponents();
		_initLayouts();
                _detectDevice();
		_buildWindow();
                _buttonConnect();
	    }
            
            function _initGlobalVars() {
                opts.connectionTypesArray = ["newVc", "connVc"];
                opts.componentsArray = Object.keys(opts.components);
                opts.devicesArray = Object.keys(opts.devices);
                opts.layoutsArray = Object.keys(opts.layouts);
                ws = {};
                wsMessage = {};
                layout = {};
                eventsAffectedComponents = {};
                vcId = null;
                clientId = null;
                monoDeviceMode = "monoDevice";
                multiDeviceMode = "multiDevice";
                appMode = monoDeviceMode;
                firstConnVcOccurred = false;
                statusCodeOk = 5000;
                firstConnVcOccurred = false;
                firstConnVcFailed = false;
                timeConnVcFail = null;
                timeFirtsConnVcFail = null;
            }
             	    
	    function _destroy(){
                if(!$.isEmptyObject(ws)){
                    ws.close();
                }
                _destroyHelper();
	    }
            
            function _destroyHelper(){
                _buttonConnect();
                _destroyWindowListeners();
                _buttonConnect();
                if(firstConnVcOccurred){
                    $("link[href='"+layout.css+"']").remove();
                    _showMonoDeviceComps();
                    _destroyEventsListeners();
                    _destroyEventsCallbacks();
                    _windowHide(function(){
                        opts.onMonoDeviceMode();
                        layout.onMonoDeviceMode();
                    });
                }else{
                    _windowHide();
                }
                _initGlobalVars();
                opts.onDestroy();
            }
            
            function _buttonConnect(){
                partifyButton.html(opts.html.connectButton);
                $(document).off("click", partifyButtonId);
                $(document).on("click", partifyButtonId, function(){
                    opts.onInit();
                    _windowShow();
                    _windowChooseLayout();
                    return false;
                });
            }
            
            function _buttonDisconnect(){
                partifyButton.html(opts.html.disconnectButton);
                $(document).off("click", partifyButtonId);
                $(document).on("click", partifyButtonId, function(){
                    _destroy();
                });
            }
            
            function _error(message){
                _destroy();
                if(opts.debug){
                    $.error('partify => ' + message);
                }
            }
	    
	    function _detectDevice(){
                $.each(opts.devices, function(currDevice, deviceDetails){
                    if(deviceDetails.minWidth && deviceDetails.maxWidth){
                        if(window.screen.width >= deviceDetails.minWidth && window.screen.width <= deviceDetails.maxWidth){
                            device = deviceDetails;
                            device.screenWidth = window.screen.width;
                            device.screenHeight = window.screen.height;
                        } 
                    }else{
                        _error('The device "' + currDevice + '" must have "minWidh" and "maxWidth" properties');
                        return false;
                    }
                });
	    }
	    
	    function _initDevices(){
                var defaultsDevice = {
                    "id": "",
                    "minWidth": 0,
                    "maxWidth": 0
                };
                $.each(opts.devices, function(currDevice, deviceDetails){
                    //override defaults with user parameters
                    defaultsDevice.id = currDevice;
                    opts.devices[currDevice] = $.extend(true, {}, defaultsDevice, deviceDetails);
                });
            }
	    
	    function _initComponents(){
                if(!$.isEmptyObject(opts.components)){
                    var defaultsComponent = {
			"id": "",
			"selector": "",
			"monoDeviceVisible": true
		    };
                    if(opts.stateful){
                        defaultsComponent.state = {};
                    }
                    $.each(opts.components, function(currComponent, componentDetails){
                        //override defaults with user parameters
                        defaultsComponent.id = currComponent;
                        defaultsComponent.monoDeviceVisible = !$(componentDetails.selector).is(":hidden");
                        opts.components[currComponent] = $.extend(true, {}, defaultsComponent, componentDetails);
                    });
                }else{
                    _error('You must define at least one component');
                    return false;
                }
            }
            
	    function _initLayouts(){
		var outgoing = {};
		var incoming = {};
                incoming.partify = {};
                $.each(events.partify, function(index, event){
                    incoming.partify[event] = function(){};
                 });
                var defaultsLayout = {
                    "id": "",
                    "name": "",
                    "description": "",
                    "connectionTypes": "newVc, connVc",
                    "devices": "",
                    "components": "",
                    "css": "",
                    "maxInstances": -1,
                    "hidden": false,
                    "events":{
                        "outgoing": outgoing,
                        "incoming": incoming
                    },
                    "onMultiDeviceMode": function(){},
                    "onMonoDeviceMode": function(){},
                    "onWarning": function(statusCode){},
                    "onWsOpen": function(ev){},
                    "onWsMessage": function(ev){},
                    "onWsError": function(ev){},
                    "onWsClose": function(statusCode, ev){}
                };
                if(!$.isEmptyObject(opts.layouts)){
                    $.each(opts.layouts, function(currLayout, layoutDetails){
                        //override defaults with user parameters
                        defaultsLayout.id = currLayout;
                        opts.layouts[currLayout] = $.extend(true, {}, defaultsLayout, layoutDetails);
                    });
                    //validate user parameters
                    $.each(opts.layouts, function(currLayout, layoutDetails){
                        layoutDetails.connectionTypesArray = $.map(layoutDetails.connectionTypes.split(","), $.trim);
                        if($.trim(layoutDetails.connectionTypesArray) != ""){
                            $.each(layoutDetails.connectionTypesArray, function(index, connectionType){
                                if($.inArray(connectionType, opts.connectionTypesArray) == -1){
                                    _error('The connection type "' + connectionType + '" of the layout "' + currLayout + '" does not exist (available connection types: "newVc", "connVc")');
                                    return false;
                                }
                            });
                        }else{
                            _error('You must list at least one connection type for the layout "' + currLayout + '"');
                            return false;
                        }
                        layoutDetails.devicesArray = $.map(layoutDetails.devices.split(","), $.trim);
                        if($.trim(layoutDetails.devices) != ""){
                            $.each(layoutDetails.devicesArray, function(index, device){
                                if($.inArray(device, opts.devicesArray) == -1){
                                    _error('The device "' + device + '" of the layout "' + currLayout + '" does not exist (available devices: "' + opts.devicesArray.join('", "') + '")');
                                    return false;
                                }
                            });
                        }else{
                            _error('You must list at least one device for the layout "' + currLayout + '"');
                            return false;
                        }
                        layoutDetails.componentsArray = $.map(layoutDetails.components.split(","), $.trim);
                        if($.trim(layoutDetails.componentsArray) != ""){
                            $.each(layoutDetails.componentsArray, function(index, component){
                                if($.inArray(component, opts.componentsArray) == -1){
                                    _error('The component "' + component + '" of the layout "' + currLayout + '" does not exist (available components: "' + opts.componentsArray.join('", "') + '")');
                                    return false;
                                }
                            });
                        }else{
                            _error('You must list at least one component for the layout "' + currLayout + '"');
                            return false;
                        }
                        $.each(layoutDetails.events.outgoing, function(typeEvents, outgoingEventsStr){
                            layoutDetails.events.outgoing[typeEvents+"Obj"] = {};
                            var tmpObj = {};
                            if(outgoingEventsStr.match(/(?:[^,(]|\([^)]*\))+/g) != null){
                                $.each(outgoingEventsStr.match(/(?:[^,(]|\([^)]*\))+/g), function(index, strToParse){
                                    tmpObj = _parseOutEvent(currLayout, typeEvents, strToParse);
                                    layoutDetails.events.outgoing[typeEvents+"Obj"][tmpObj.event] = {};
                                    if(opts.stateful){
                                        layoutDetails.events.outgoing[typeEvents+"Obj"][tmpObj.event].affectedComponents = tmpObj.affectedComponents;
                                    }
                                });
                            }else{
                                _error('You must list at least one outgoing event of type "' + typeEvents + '" for the layout "' + currLayout + '"');
                                return false;
                            }
                        });
                    });
                }else{
                    _error('You must define at least one layout');
                    return false;
                }
	    }

	    function _showLayout(){
                $('<link href="'+layout.css+'" rel="stylesheet" type="text/css" media="screen">').appendTo("head");
                $("body").animate({"scrollTop":0}, "fast");
                $.each(opts.components, function(currComponent, componentDetails){
                    if($.inArray(currComponent, layout.componentsArray)>-1){
                        $(componentDetails.selector).show();
                    }else{
                        $(componentDetails.selector).hide();
                    } 
                });
	    }
            
            function _showMonoDeviceComps(){
                $.each(opts.components, function(currComponent, componentDetails){
                    if(componentDetails.monoDeviceVisible){
                        $(componentDetails.selector).show();
                    }else{
                        $(componentDetails.selector).hide();
                    } 
                });
            }

	    function _buildWindow(){
	       var partifyOverlayHtml = '';
	       partifyOverlayHtml = '<div id="partifyOverlay"></div>';
	       var partifyWindowHtml = '';
	       partifyWindowHtml += '<div id="partifyWindow">';
	       partifyWindowHtml += '	<div id="partifyWindowHeader">';
	       partifyWindowHtml += '	    <div id="partifyWindowTitle">' + opts.html.window.header.title + '</div>';
	       partifyWindowHtml += '	    <div id="partifyWindowClose">' + opts.html.window.header.close + '</div>';
	       partifyWindowHtml += '	</div>';
	       partifyWindowHtml += '	<div id="partifyWindowContent"></div>';
	       partifyWindowHtml += '	<img src="' + opts.html.window.content.loadingImgPath + '" style="display:none;"/>';
	       partifyWindowHtml += '</div>';
	       $("body").append(partifyOverlayHtml);
	       $("body").append(partifyWindowHtml);
	    }
	    
	    function _windowShow(){
		if($("#partifyWindow").is(":hidden")){
                    $("#partifyWindow").slideDown("fast");
                    $("#partifyOverlay").fadeIn("fast").promise().done(function() {
                        opts.onWindowShow();
                        $(document).off("click", "#partifyWindowClose, #partifyOverlay");
                        $(document).on("click", "#partifyWindowClose, #partifyOverlay", function(){
                           _destroy();
                       });
                   });
               }
	    }
	     
	    function _windowHide(callback){
		if(!$("#partifyOverlay").is(":hidden")){
                    $("#partifyOverlay").fadeOut("fast");
                    $("#partifyWindow").slideUp("fast").promise().done(function() {
                        opts.onWindowHide();
                        $("#partifyVcId").html("");
                        $(".partifyWarningMessage").html("");
                        if(callback)callback();
                    });
                }else{
                    if(callback)callback();
                }
	    }
	    
	    function _windowChooseLayout(){
		var deviceLayoutsIds = [];
                $.each(opts.layouts, function(currLayout, currLayoutDetails){
                    if($.inArray(device.id, currLayoutDetails.devicesArray) > -1 && !currLayoutDetails.hidden){
                        deviceLayoutsIds.push(currLayout);
                    }
                });
                var partifyWindowContentHtml = '';
                if(deviceLayoutsIds.length > 1){
                    partifyWindowContentHtml += '<div id="partifyLayoutsCell">';
                    partifyWindowContentHtml += '	    <div id="partifyLayoutsBox">';
                    partifyWindowContentHtml += '             <div class="partifyLoadingBox">';
                    partifyWindowContentHtml += '                 <img src="' + opts.html.window.content.loadingImgPath + '" class="partifyLoadingImg"/>';		
                    partifyWindowContentHtml += '             </div>';
                    partifyWindowContentHtml += '             <div id="partifyLayoutChoice">';
                    partifyWindowContentHtml += '                 <div id="partifyLayoutLabel">' + opts.html.window.content.layoutsLabel + '</div>';
                    partifyWindowContentHtml += '                 <div id="partifyLayouts">';
                    $.each(deviceLayoutsIds, function(index, layoutId){
                        var currLayout = opts.layouts[layoutId];
                        partifyWindowContentHtml += '             <div class="partifyLayout partifyButton" layoutId="'+layoutId+'">';
                        partifyWindowContentHtml += '                 <div class="partifyLayoutName">'+currLayout.html.name+'</div>';
                        partifyWindowContentHtml += '                 <div class="partifyLayoutDescription">'+currLayout.html.description+'</div>';
                        partifyWindowContentHtml += '             </div>';
                    });
                    partifyWindowContentHtml += '                 </div>';
                    partifyWindowContentHtml += '		</div>';
                    partifyWindowContentHtml += '	    </div>';
                    partifyWindowContentHtml += '</div>';
                    $("#partifyWindowContent").html(partifyWindowContentHtml);
                    $(document).off("click", ".partifyLayout");
                    $(document).on("click", ".partifyLayout", function(){
                        layout = opts.layouts[$(this).attr("layoutId")];
                        _createConnection();
                    });
                }else if(deviceLayoutsIds.length == 1){
                    partifyWindowContentHtml += '<div id="partifyLayoutsCell">';
                    partifyWindowContentHtml += '	    <div id="partifyLayoutsBox">';
                    partifyWindowContentHtml += '             <div class="partifyLoadingBox">';
                    partifyWindowContentHtml += '                 <img src="' + opts.html.window.content.loadingImgPath + '" class="partifyLoadingImg"/>';		
                    partifyWindowContentHtml += '             </div>';
                    partifyWindowContentHtml += '             <div id="partifyLayoutChoice">';
                    partifyWindowContentHtml += '             </div>';
                    partifyWindowContentHtml += '         </div>';
                    partifyWindowContentHtml += '</div>';
                    $("#partifyWindowContent").html(partifyWindowContentHtml);
                    layout = opts.layouts[deviceLayoutsIds[0]];
                    _createConnection();
                }else{
                    _error('The "' + device.id + '" device has no associated visibile layouts');
                    return false;
                }		
	    }
	    
	    function _addNameSpaceAndTrim(item){
		return $.trim(item) + "." + nameSpace;
	    }     
            
            function _parseOutEvent(currlayout, eventType, strToParse){
                var affectedComponentsMatch = strToParse.match(/\((.*?)\)/g);
                var affectedComponents = [];
                var event = $.trim(strToParse);
                var returnObj = {};
                if(affectedComponentsMatch){
                    affectedComponents = $.trim(strToParse.match(/\((.*?)\)/g)[0]);
                    affectedComponents = affectedComponents.slice(1,-1);
                    event = $.trim(strToParse.replace("("+affectedComponents+")", ""));
                    affectedComponents = $.map(affectedComponents.split(","), $.trim);
                    $.each(affectedComponents, function(index, component){
                        if($.inArray(component, opts.componentsArray) == -1){
                            _error('The affected component "' + component + '" by the outgoing event "' + event + '" of the layout "' + currlayout + '" does not exist');
                            return false;
                        }
                    });
                }
                if(eventType != "custom" && $.inArray(event, events[eventType]) == -1){
                    _error('The outgoing event "' + event + '" of the layout "' + currlayout + '" does not exist in the default "' + eventType + '" events');
                    return false;
                }
                returnObj.event = event; 
                returnObj.affectedComponents = affectedComponents; 
                return returnObj;
            }
	    
	    function _initEventsListeners() {
		_initKeyboardListener();
		_initMouseListener();
		_initTouchListener();
		_initCustomListener();
	    }

	    function _initEventsCallbacks() {
		_initKeyboardCallbacks();
		_initMouseCallbacks();
		_initTouchCallbacks();
		_initCustomCallbacks();
	    }
            
            function _destroyWindowListeners() {
                $(document).off("click", "#partifyWindowClose, #partifyOverlay");
                $(document).off("click", ".partifyLayout");
                $(document).off("keydown", "#partifyConnectVcId");
                $(document).off("click", "#partifyConnectVcButton");
                $(document).off("click", "#partifyVcBox .partifyWarningBackButton");
                $(document).off("click", "#partifyConnectVcBox .partifyWarningBackButton");
	    }
	    
	    function _destroyEventsListeners() {
		_destroyKeyboardListener();
		_destroyMouseListener();
		_destroyTouchListener();
		_destroyCustomListener();
	    }

	    function _destroyEventsCallbacks() {
		_destroyKeyboardCallbacks();
		_destroyMouseCallbacks();
		_destroyTouchCallbacks();
		_destroyCustomCallbacks();
	    }

	    function _onGenericEvent(ev) {
		wsMessage = { "cmd": "triggerVcEvent", "vcId": vcId, "event": ev,  "client": {"device": device, "layout":  {"id": layout.id}}};
		if(opts.stateful){
                    wsMessage.client.layout.components = layout.componentsArray;
                }
                _wsSend(wsMessage);
	    }

	    function _initKeyboardListener() {
		var keyboardEvents = layout.events.outgoing.keyboard;
		if (keyboardEvents) {
		    if (keyboardEvents == "all") {
			keyboardEvents = $.map(events.keyboard.join(" "), _addNameSpaceAndTrim);
		    }else{
			keyboardEvents = $.map(Object.keys(layout.events.outgoing.keyboardObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).on(keyboardEvents, function(ev) {
			if(!ev.namespace || ev.namespace != nameSpace){
			    var keyboardEvent = {
				"type": ev.type,
                                "eventData":{
                                    "timeStamp": ev.timeStamp,
                                    "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                    "altKey": ev.altKey,
                                    "shiftKey": ev.shiftKey,
                                    "ctrlKey": ev.ctrlKey,
                                    "metaKey": ev.metaKey,
                                    "charCode": ev.charCode,
                                    "keyCode": ev.keyCode
                                }
			    };
                            if(opts.stateful){
                                keyboardEvent.affectedComponents = layout.events.outgoing.keyboardObj[ev.type].lenght>0?layout.events.outgoing.keyboardObj[ev.type].join(", "):"";
                            }
			    _onGenericEvent(keyboardEvent);
			}
		    });
		}
	    }
	    
	    function _destroyKeyboardListener() {
		var keyboardEvents = layout.events.outgoing.keyboard;
		if (keyboardEvents) {
		    if (keyboardEvents == "all") {
			keyboardEvents = $.map(events.keyboard.join(" "), _addNameSpaceAndTrim);
		    }else{
                        keyboardEvents = $.map(Object.keys(layout.events.outgoing.keyboardObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).off(keyboardEvents);
		}
	    }

	    function _initKeyboardCallbacks() {
		if(layout.events.incoming.keyboard){
		    $.each(layout.events.incoming.keyboard, function(keyboardEvent, keyboardCallback) {
			$(document).on(_addNameSpaceAndTrim(keyboardEvent), keyboardCallback);
		    });
		}
	    }
	    
	    function _destroyKeyboardCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.keyboard){
		    $.each(layout.events.incoming.keyboard, function(keyboardEvent, keyboardCallback) {
			$(document).off(_addNameSpaceAndTrim(keyboardEvent));
		    });
		}
	    }

	    function _initMouseListener() {
		var mouseEvents = layout.events.outgoing.mouse;
		if (mouseEvents) {
		    if (mouseEvents == "all") {
			mouseEvents = $.map(events.mouse.join(" "), _addNameSpaceAndTrim);
		    }else{
                        mouseEvents = $.map(Object.keys(layout.events.outgoing.mouseObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).on(mouseEvents, function(ev) {
			if(!ev.namespace || ev.namespace != nameSpace){
			    var mouseEvent = {
				"type": ev.type,
                                "eventData":{
                                    "timeStamp": ev.timeStamp,
                                    "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                    "altKey": ev.altKey,
                                    "shiftKey": ev.shiftKey,
                                    "ctrlKey": ev.ctrlKey,
                                    "metaKey": ev.metaKey,
                                    "button": ev.button,
                                    "center": {"pageX": ev.pageX, "pageY": ev.pageY},
                                    "target": {"id": ev.target.id, "classes": ev.target.className.split(" ")}
                                }
			    };
                            if(opts.stateful){
                                mouseEvent.affectedComponents = layout.events.outgoing.mouseObj[ev.type].affectedComponents.length>0?layout.events.outgoing.mouseObj[ev.type].affectedComponents:[];
                            }
			    _onGenericEvent(mouseEvent);
			}
		    });
		}
	    }
	    
	    function _destroyMouseListener() {
		var mouseEvents = layout.events.outgoing.mouse;
		if (mouseEvents) {
		    if (mouseEvents == "all") {
			mouseEvents = $.map(events.mouse.join(" "), _addNameSpaceAndTrim);
		    }else{
                        mouseEvents = $.map(Object.keys(layout.events.outgoing.mouseObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).off(mouseEvents);
		}
	    }

	    function _initMouseCallbacks() {
		if(layout.events.incoming.mouse){
		    $.each(layout.events.incoming.mouse, function(mouseEvent, mouseCallback) {
			$(document).on(_addNameSpaceAndTrim(mouseEvent), mouseCallback);
		    });
		}
	    }

	    function _destroyMouseCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.mouse){
		    $.each(layout.events.incoming.mouse, function(mouseEvent, mouseCallback) {
			$(document).off(_addNameSpaceAndTrim(mouseEvent));
		    });
		}
	    }

	    function _initTouchListener() {
		var touchEvents = layout.events.outgoing.touch;
		if (touchEvents) {
		    if (touchEvents == "all") {
			touchEvents = $.map(events.touch.join(" "), _addNameSpaceAndTrim);
		    }else{
                        touchEvents = $.map(Object.keys(layout.events.outgoing.touchObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).hammer({"prevent_default":true}).on(touchEvents, function(ev) {
			if(!ev.namespace || ev.namespace != nameSpace){
			    var touches = [];
			    var touchEvent = {};
			    var startEvent = {};
			    if (ev.gesture) {
				if(ev.gesture.startEvent.touches){
				    $.each(ev.gesture.startEvent.touches, function(index, touch) {
					touches.push({
					    "type": touch.type,
                                            "eventData":{
                                                "center": {"pageX": touch.pageX, "pageY": touch.pageY},
                                                "parentOffsetX": touch.offsetX,
                                                "parentOffsetY": touch.offsetY,
                                                "target": {"id": touch.target.id, "classes": touch.target.className.split(" ")}
                                            }
					});
				    });
				}
				startEvent = {
				    "type": ev.type,
                                    "eventData":{
                                        "timeStamp": ev.gesture.startEvent.timeStamp,
                                        "target": {"id": ev.gesture.target.id, "classes": ev.gesture.target.className.split(" ")},
                                        "center": ev.gesture.startEvent.center,
                                        "pointerType": ev.gesture.startEvent.pointerType,
                                        "eventType": ev.gesture.startEvent.eventType,
                                        "srcEventType": ev.gesture.startEvent.srcEvent.type,
                                        "touches": touches
                                    }
				};
				if(ev.gesture.touches){
				    touches = [];
				    $.each(ev.gesture.touches, function(index, touch) {
					touches.push({
					    "type": touch.type,
                                            "eventData":{
                                                "center": {"pageX": touch.pageX, "pageY": touch.pageY},
                                                "parentOffsetX": touch.offsetX,
                                                "parentOffsetY": touch.offsetY,
                                                "target": {"id": touch.target.id, "classes": touch.target.className.split(" ")}
                                            }
					});
				    });
				}
				touchEvent = {
				    "type": ev.type,
                                    "eventData":{
                                        "timeStamp": ev.gesture.timeStamp,
                                        "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                        "target": {"id": ev.gesture.target.id, "classes": ev.gesture.target.className.split(" ")},
                                        "center": ev.gesture.center,
                                        "pointerType": ev.gesture.pointerType,
                                        "deltaTime": ev.gesture.deltaTime,
                                        "deltaX": ev.gesture.deltaX,
                                        "deltaY": ev.gesture.deltaY,
                                        "velocityX": ev.gesture.velocityX,
                                        "velocityY": ev.gesture.velocityY,
                                        "angle": ev.gesture.angle,
                                        "direction": ev.gesture.direction,
                                        "distance": ev.gesture.distance,
                                        "scale": ev.gesture.scale,
                                        "rotation": ev.gesture.rotation,
                                        "eventStatus": ev.gesture.eventType,
                                        "srcEventType": ev.gesture.srcEvent.type,
                                        "startEvent": startEvent,
                                        "touches": touches
                                    }
				};
                                if(opts.stateful){
                                    touchEvent.affectedComponents = layout.events.outgoing.touchObj[ev.type].affectedComponents.length>0?layout.events.outgoing.touchObj[ev.type].affectedComponents:[];
                                }
			    }
			    _onGenericEvent(touchEvent);
			}
		    });
		}
	    }

	    function _destroyTouchListener() {
		var touchEvents = layout.events.outgoing.touch;
		if (touchEvents) {
		    if (touchEvents == "all") {
			touchEvents = $.map(events.touch.join(" "), _addNameSpaceAndTrim);
		    }else{
                        touchEvents = $.map(Object.keys(layout.events.outgoing.touchObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).hammer().off(touchEvents);
		}
	    }

	    function _initTouchCallbacks() {
		if(layout.events.incoming.touch){
		    $.each(layout.events.incoming.touch, function(touchGestureEvent, touchGestureCallback) {
			$(document).on(_addNameSpaceAndTrim(touchGestureEvent), touchGestureCallback);
		    });
		}
	    }

	    function _destroyTouchCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.touch){
		    $.each(layout.events.incoming.touch, function(touchGestureEvent, touchGestureCallback) {
			$(document).off(_addNameSpaceAndTrim(touchGestureEvent));
		    });
		}
	    }

	    function _initCustomListener() {
		var customEvents = layout.events.outgoing.custom;
		if (customEvents) {
                    customEvents = $.map(Object.keys(layout.events.outgoing.customObj), _addNameSpaceAndTrim).join(" ");
                    $(document).on(customEvents, function(ev) {
			if(!ev.namespace || ev.namespace != nameSpace){
                            var defaultCustomEventData = {
                                "timestamp": ev.timeStamp,
                                "screenDim": {"height": window.screen.height, "width": window.screen.width}
                            };
			    var customEvent = {
                                "type": ev.type,
                                "eventData": $.extend(true, {}, defaultCustomEventData, ev.eventData)
                            };
                            if(opts.stateful){
                                customEvent.affectedComponents = layout.events.outgoing.customObj[ev.type].affectedComponents.length>0?layout.events.outgoing.customObj[ev.type].affectedComponents:[];
                            }
			    _onGenericEvent(customEvent);
			}
		    });
		}
	    }

	    function _destroyCustomListener() {
		var customEvents = layout.events.outgoing.custom;
		if (customEvents) {
                    customEvents = $.map(Object.keys(layout.events.outgoing.customObj), _addNameSpaceAndTrim).join(" ");
		    $(document).off(customEvents);
		}
	    }

	    function _initCustomCallbacks() {
		if(layout.events.incoming.custom){
		    $.each(layout.events.incoming.custom, function(customEvent, customEventCallback) {
			$(document).on(_addNameSpaceAndTrim(customEvent), customEventCallback);
		    });
		}
	    }

	    function _destroyCustomCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.custom){
		    $.each(layout.events.incoming.custom, function(customEvent, customEventCallback) {
			$(document).off(_addNameSpaceAndTrim(customEvent));
		    });
		}
	    }

	    function _createConnection() {
		if (window.WebSocket) {
                    if($.isEmptyObject(ws)){
                        ws = new WebSocket("ws://" + opts.ip + ":" + opts.port + "/");
                        ws.onopen = _wsOnOpen;
                        ws.onmessage = _wsOnMessage;
                        ws.onerror = _wsOnError;
                        ws.onclose = _wsOnClose;
                        $("#partifyLayoutsBox .partifyLoadingBox").show();
                        $("#partifyLayoutChoice").hide();
                    }else{
                        _error("Waiting for WebSocket connection");
                        return false;
                    }
		} else {
		    _error("The current browser does not support WebSockets");
                    return false;
		}
	    }
	    
	    function _wsSend(wsMessage) {
                wsMessage = JSON.stringify(wsMessage);
                if(ws.readyState === 1){
                    ws.send(wsMessage);
                }else{
                    _error('WebSocket connection has been lost');
                    return false;
                }
            }
	    
	    function _wsOnOpen(ev) {
                _displayConnTypes();
		opts.onWsOpen(ev);
		layout.onWsOpen(ev);
	    }
	    
	    function _wsOnError(ev) {
		opts.onWsError(ev);
                if(!$.isEmptyObject(layout)){
                    layout.onWsError(ev);
                }
	    }

	    function _wsOnClose(ev) {
                if(ev.code===1006){
                    $("#partifyLayoutsBox .partifyLoadingBox").hide();
                    $("#partifyLayoutChoice").html('<div class="partifyWarningMessage">' + opts.html.window.content.warningMessages[ev.code] + '</div>');
                    $("#partifyLayoutChoice").show();
                }
		opts.onWsClose(ev.code, ev);
                if(!$.isEmptyObject(layout)){
                    layout.onWsClose(ev.code, ev);
                }
	    }
	    
	    function _wsOnMessage(ev) {
		var wsMessage = JSON.parse(ev.data);
                switch (wsMessage.cmd) {
                    case "newVc":
                        _newVcHandler(wsMessage);
                        break;
                    case "connVc":
                        _connVcHandler(wsMessage);
                        break;
                    case "changeLayout":
                        _changeLayoutHandler(wsMessage);
                        break;
                    case "triggerVcEvent":
                        _triggerVcEventHandler(wsMessage);
                        break;
                    case "rmVcClient":
                        _rmVcClientHandler(wsMessage);
                        break;
                    case "rmVc":
                        _rmVcHandler(wsMessage);
                        break;
                    default:
                        break;
                }
		opts.onWsMessage(wsMessage);
		layout.onWsMessage(wsMessage);
	    }
             
            function _displayConnTypes(){
                var partifyWindowContentHtml = '';
                partifyWindowContentHtml += _connTypeNewVc();
                partifyWindowContentHtml += _connTypeConnVc();
                $("#partifyWindowContent").html(partifyWindowContentHtml);
                if($("#partifyConnectVcId").length){
                    $("#partifyConnectVcId").focus();
                }
            } 
            
            function _connTypeNewVc(){
                var partifyWindowContentHtml = '';
                if($.inArray("newVc", layout.connectionTypesArray) > -1){
                    _newVc();
                    partifyWindowContentHtml += '<div id="partifyVcCell" ' + (layout.connectionTypesArray.length==1?'class="partifyMaxyCell"':'') + '>';
                    partifyWindowContentHtml += '	<div id="partifyVcBox">';
                    partifyWindowContentHtml += '	    <div id="partifyVcLabel">' + opts.html.window.content.vcLabel + '</div>';
                    partifyWindowContentHtml += '         <div class="partifyLoadingBox">';
                    partifyWindowContentHtml += '             <img src="' + opts.html.window.content.loadingImgPath + '" class="partifyLoadingImg"/>';		
                    partifyWindowContentHtml += '         </div>';
                    partifyWindowContentHtml += '	    <div id="partifyVcId"></div>';
                    partifyWindowContentHtml += '	</div>';
                    partifyWindowContentHtml += '</div>';
                }
                return partifyWindowContentHtml;
            }
            
            function _connTypeConnVc(){
                var partifyWindowContentHtml = '';
                if($.inArray("connVc", layout.connectionTypesArray) > -1){
                    partifyWindowContentHtml += '<div id="partifyConnectVcCell" ' + (layout.connectionTypesArray.length==1?'class="partifyMaxyCell"':'') + '>';
                    partifyWindowContentHtml += '	<div id="partifyConnectVcBox">';
                    partifyWindowContentHtml += '	    <div id="partifyConnectVcLabel">' + opts.html.window.content.connectVcLabel + '</div>';
                    partifyWindowContentHtml += '         <div class="partifyLoadingBox">';
                    partifyWindowContentHtml += '             <img src="' + opts.html.window.content.loadingImgPath + '" class="partifyLoadingImg"/>';		
                    partifyWindowContentHtml += '         </div>';
                    partifyWindowContentHtml += '	    <div id="partifyConnectVc"><input type="text" pattern="[0-9]*" id="partifyConnectVcId"/><button id="partifyConnectVcButton">' + opts.html.window.content.connectVcButton + '</button></div>';
                    partifyWindowContentHtml += '	</div>';
                    partifyWindowContentHtml += '</div>';
                    $(document).off("keydown", "#partifyConnectVcId");
                    $(document).on("keydown", "#partifyConnectVcId", function(event){
                        if(event.keyCode == 13) {
                           $("#partifyConnectVcButton").trigger("click");
                        }
                    });
                    $(document).off("click", "#partifyConnectVcButton");
                    $(document).on("click", "#partifyConnectVcButton", function(){
                        vcId = $("#partifyConnectVcId").val();
                        _connVc();
                    });
                }
                return partifyWindowContentHtml;
            }
             
            function _newVc(){
                $("#partifyVcId").hide();
                $("#partifyVcBox .partifyLoadingBox").show();
		wsMessage = {"cmd": "newVc", "vcId": "", "client": {"device": device, "layout": {"id": layout.id}}};
		if(opts.stateful){
                    wsMessage.initComponents = {};
                    $.each(opts.components, function(currComp, compDetails){
                        wsMessage.initComponents[currComp] = {};
                        wsMessage.initComponents[currComp].id = compDetails.id;
                        wsMessage.initComponents[currComp].state = compDetails.state;
                    });
                    wsMessage.client.layout.components = opts.componentsArray;
                }
                wsMessage.initLayouts = {};
                $.each(opts.layouts, function(currLayout, layoutDetails){
                    wsMessage.initLayouts[currLayout] = {};
                    wsMessage.initLayouts[currLayout].id = layoutDetails.id;
                    wsMessage.initLayouts[currLayout].maxInstances = layoutDetails.maxInstances;
                    wsMessage.initLayouts[currLayout].instances = [];
                });
                _wsSend(wsMessage);
            }     
            
            function _connVc(){
                $("#partifyConnectVc").hide();
                $("#partifyConnectVcBox .partifyLoadingBox").show();
                wsMessage = {"cmd": "connVc", "vcId": vcId, "client": {"device": device, "layout":  {"id": layout.id}}};
                if(opts.stateful){
                    wsMessage.client.layout.components = layout.componentsArray;
                }
                _wsSend(wsMessage);
            }
            
            function _changeLayout(layoutId){
                if(opts.layouts[layoutId]){
                    if(layoutId != layout.id){
                        if($.inArray(device.id, opts.layouts[layoutId].devicesArray)>-1){
                            var oldLayout = layout;
                            var newLayout = opts.layouts[layoutId];
                            layout = newLayout;
                            wsMessage = {"cmd": "changeLayout", "vcId": vcId, "client": {"device": device, "layout":  {"id": layout.id}, "oldLayout": {"id": oldLayout.id}}};
                            if(opts.stateful){
                                wsMessage.client.layout.components = layout.componentsArray;
                            }
                            _wsSend(wsMessage);
                        }else{
                            _error('The layout "' + layoutId + '"  is not associated with the current "' + device.id + '" device');
                            return false;
                        }
                    }else{
                        _error('The layout "' + layoutId + '" is the current layout');
                        return false;
                    }
                }else{
                    _error('The layout "' + layoutId + '" does not exist');
                    return false;
                }
            }
                                  
	    function _newVcHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
                $("#partifyVcBox .partifyLoadingBox").hide();
                $("#partifyVcId").show();
                vcId = wsMessage.vcId;
                if(clientId == null && wsMessage.client.isMe){
                    clientId = wsMessage.client.id;
                }
		if(wsMessage.statusCode!=statusCodeOk){
                    opts.onWarning(wsMessage.statusCode);
                    layout.onWarning(wsMessage.statusCode);
                    var partifyWindowWarningHtml = '';
                    partifyWindowWarningHtml += '<div class="partifyWarning">';
                    partifyWindowWarningHtml += ' <div class="partifyWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                    partifyWindowWarningHtml += ' <div class="partifyWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                    partifyWindowWarningHtml += '</div>';
                    $("#partifyVcId").html(partifyWindowWarningHtml);
                    $(document).off("click", "#partifyVcBox .partifyWarningBackButton");
                    $(document).on("click", "#partifyVcBox .partifyWarningBackButton", function(){
                        $("#partifyVcId").hide();
                        $("#partifyVcBox .partifyLoadingBox").show();
                        var partifyWindowContentHtml = '';
                        partifyWindowContentHtml += _connTypeNewVc();
                        $("#partifyVcCell").replaceWith(partifyWindowContentHtml);
                    });
		}else{
                    $("#partifyVcId").html(vcId);
                    layout.events.incoming.partify.newVc(event, wsMessage);
		}
	    }
            
	    function _connVcHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
                if(clientId == null && wsMessage.client.isMe){
                    clientId = wsMessage.client.id;
                }
		if(wsMessage.statusCode != statusCodeOk){
                    if(wsMessage.lock){
                        timeConnVcFail = Date.now();
                        if(!firstConnVcFailed){
                            firstConnVcFailed = true;
                            timeFirtsConnVcFail = timeConnVcFail;
                        }
                        if(timeConnVcFail - timeFirtsConnVcFail > opts.connVcTimeout){
                            opts.onWarning(wsMessage.statusCode);
                            layout.onWarning(wsMessage.statusCode);
                            firstConnVcFailed = false;
                            $("#partifyConnectVcBox .partifyLoadingBox").hide();
                            $("#partifyConnectVc").show();
                            var partifyWindowWarningHtml = '';
                            partifyWindowWarningHtml += '<div class="partifyWarning">';
                            partifyWindowWarningHtml += ' <div class="partifyWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                            partifyWindowWarningHtml += ' <div class="partifyWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                            partifyWindowWarningHtml += '</div>';
                            $("#partifyConnectVc").html(partifyWindowWarningHtml);
                            $(document).off("click", "#partifyConnectVcBox .partifyWarningBackButton");
                            $(document).on("click", "#partifyConnectVcBox .partifyWarningBackButton", function(){
                                var partifyWindowContentHtml = '';
                                partifyWindowContentHtml += _connTypeConnVc();
                                $("#partifyConnectVcCell").replaceWith(partifyWindowContentHtml);
                                $("#partifyConnectVcId").focus();
                            });
                        }else{
                            setTimeout(function(){_connVc()}, opts.connVcInterval);
                        }
                    }else{
                        opts.onWarning(wsMessage.statusCode);
                        layout.onWarning(wsMessage.statusCode);
                        $("#partifyConnectVcBox .partifyLoadingBox").hide();
                        $("#partifyConnectVc").show();
                        var partifyWindowWarningHtml = '';
                        partifyWindowWarningHtml += '<div class="partifyWarning">';
                        partifyWindowWarningHtml += ' <div class="partifyWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                        partifyWindowWarningHtml += ' <div class="partifyWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                        partifyWindowWarningHtml += '</div>';
                        $("#partifyConnectVc").html(partifyWindowWarningHtml);
                        $(document).off("click", "#partifyConnectVcBox .partifyWarningBackButton");
                        $(document).on("click", "#partifyConnectVcBox .partifyWarningBackButton", function(){
                            var partifyWindowContentHtml = '';
                            partifyWindowContentHtml += _connTypeConnVc();
                            $("#partifyConnectVcCell").replaceWith(partifyWindowContentHtml);
                            $("#partifyConnectVcId").focus();
                        });
                    }
		}else{
                    if(!firstConnVcOccurred){
                        firstConnVcOccurred = true;
                        $("#partifyConnectVcBox .partifyLoadingBox").hide();
                        if(opts.stateful){
                            if(wsMessage.client.isMe){
                                _setLocalLayoutState(wsMessage.componentsFromServer);
                            }
                        }
                        partifyButton.focus();
                        _showLayout();
                        _initEventsListeners();
                        _initEventsCallbacks();
                        _buttonDisconnect();
                        _windowHide(function(){
                            layout.events.incoming.partify.connVc(event, wsMessage);
                            opts.onMultiDeviceMode();
                            layout.onMultiDeviceMode();
                            appMode = multiDeviceMode;
                        });
                    }else{
                        layout.events.incoming.partify.connVc(event, wsMessage);
                    }
		}
	    }
            
            function _changeLayoutHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
		if(wsMessage.statusCode != statusCodeOk){
                    opts.onWarning(wsMessage.statusCode);
                    layout.onWarning(wsMessage.statusCode);
		}else{
                    if(wsMessage.client.isMe){
                        $("link[href='" + opts.layouts[wsMessage.client.oldLayout.id].css + "']").remove();
                        _destroyEventsListeners();
                        _destroyEventsCallbacks();
                        eventsAffectedComponents = {};
                        if(opts.stateful){
                            _setLocalLayoutState(wsMessage.componentsFromServer);
                        }
                        _showLayout();
                        _initEventsListeners();
                        _initEventsCallbacks();
                    }
                    layout.events.incoming.partify.changeLayout(event, wsMessage);
		}
            }
            
	    function _triggerVcEventHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.event.type,
                    "eventData": wsMessage.event.eventData,
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                if(opts.stateful){
                    event.affectedComponents = wsMessage.event.affectedComponents;
                }
                _triggerVcEvent(event);
                layout.events.incoming.partify.triggerVcEvent(event, wsMessage);
	    }	    
	    
            function _rmVcClientHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                layout.events.incoming.partify.rmVcClient(event, wsMessage);
            }
            
            function _rmVcHandler(wsMessage){
                var event = {
                    "namespace": nameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                layout.events.incoming.partify.rmVc(event, wsMessage);
            }
            
	    function _triggerVcEvent(event){
		$(document).trigger(event);
	    }	    

            function _setLocalLayoutState(components){
                if(components){
                    $.each(components, function(currComp, compDetails){
                        opts.components[currComp].state = $.extend(true, opts.components[currComp].state, compDetails.state); 
                    });
                }
            }

            function _setLocalVcCompState(compId, state){
                if(opts.components[compId]){
                    opts.components[compId].state = state;  
                    if(vcId != null){
                        _setServerVcCompState(compId);
                    }
                }else{
                    _error('The component "' + compId + '" does not exist');
                    return false;
                }
            }
            
            function _setServerVcCompState(compId){
                var componentState = {};
                componentState.id = opts.components[compId].id;
                componentState.state = opts.components[compId].state;
                wsMessage = {"cmd": "setVcCompState", "vcId": vcId, "componentState":  componentState, "client": {"device": device, "layout": {"id":layout.id, "components": layout.componentsArray}}};
                _wsSend(wsMessage);
            }

            function _getLocalVcCompState(compId){
                if(opts.components[compId]){
                    return opts.components[compId].state;
                }else{
                    _error('The component "' + compId + '" does not exist');
                    return false;
                }
            }
            
            function _getMyId(){
                return clientId;
            }
            
            function _getMyVc(){
                return vcId;
            }
            
            function _getMyDevice(){
                return device;
            }
            
            function _getMyLayout(){
                return layout;
            }

            function _getMyAppMode(){
                return appMode;
            }
            
            //public methods
            var publicMethods = {};
            publicMethods =  {
                "triggerVcEvent": _triggerVcEvent,
                "changeLayout": _changeLayout,
                "destroy": _destroy,
                "getMyId": _getMyId,
                "getMyVc": _getMyVc,
                "getMyDevice": _getMyDevice,
                "getMyLayout": _getMyLayout,
                "getMyAppMode": _getMyAppMode
            };
            
	    if(opts.stateful){
                publicMethods.setVcCompState = _setLocalVcCompState;
                publicMethods.getVcCompState = _getLocalVcCompState;
            }
            
            return publicMethods;
            
	};
	
})(jQuery);