/*
@@license
*/
(function() {
'use strict';

// initialize the data in local storage
function initData() {
	// using local storage as a quick and dirty replacement for MVC
	// not using chrome.storage 'cause the async nature of it complicates things
	// just remember to use parse methods because all values are strings
	var oldVer = parseInt(localStorage.version,10);

	// latest version
	localStorage.version = '3';

	// Add the new version 3 values
	if (!oldVer || (oldVer < 3)) {
		localStorage.background = '"background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)"';
		// these not implemented yet
		localStorage.useFlickr = 'true';
		localStorage.useFlickrSelections = '[]';
		localStorage.use500px = 'true';
		localStorage.use500pxSelections = '[]';
	}

	// Add the new version 2 values
	if (!oldVer || (oldVer < 2)) {
		localStorage.allDisplays = 'false';
		localStorage.activeStart = '"00:00"'; // 24 hr time
		localStorage.activeStop = '"00:00"';	// 24 hr time
		localStorage.allowSuspend = 'false';
		localStorage.showTime = '1'; // 12 hour format
		localStorage.showPhotog = 'true';
		localStorage.usePopular500px = 'false';
		localStorage.useYesterday500px = 'false';
		localStorage.useInterestingFlickr = 'false';
		localStorage.useFavoriteFlickr = 'false';
	}

	// values from the beginning of time
	if (!oldVer) {
		localStorage.enabled = 'true';
		localStorage.idleTime = '10'; // minutes
		localStorage.transitionTime = '30'; // seconds
		localStorage.skip = 'true';
		localStorage.shuffle = 'true';
		localStorage.keepAwake = 'false';
		localStorage.photoSizing = '0';
		localStorage.photoTransition = '4';
		localStorage.useChromecast = 'true';
		localStorage.useAuthors = 'false';
		localStorage.useGoogle = 'true';
		localStorage.albumSelections = '[]';
		//localStorage.isPreview = 'false'; // no longer used
		//localStorage.windowID = '-1';	// no longer used
	}

	// remove unused variables
	localStorage.removeItem('isPreview');
	localStorage.removeItem('windowID');
}

// set the text label displayed on the icon
function setBadgeText() {
	var text = '';
	if (JSON.parse(localStorage.enabled)) {
		text = (JSON.parse(localStorage.keepAwake) && !isActive()) ? 'SLP' : '';
	} else {
		text = JSON.parse(localStorage.keepAwake) ? 'PWR' : 'OFF';
	}
	chrome.browserAction.setBadgeText({text: text});
}

// return true if screensaver can be displayed
function isActive() {
	var enabled = JSON.parse(localStorage.enabled);
	var aStart = JSON.parse(localStorage.activeStart);
	var aStop = JSON.parse(localStorage.activeStop);

	if (!enabled || !myUtils.isInRange(aStart, aStop)) {
		return false;
	}
	return true;
}

// set state when the screensaver is in the non-active range
function setInactiveState() {
	JSON.parse(localStorage.allowSuspend) ? chrome.power.releaseKeepAwake() : chrome.power.requestKeepAwake('system');
	closeScreenSavers();
	setBadgeText();
}

// enabled state of screensaver
// note: this does not effect the keep awake settings so you could
// use the extension as a display keep awake scheduler without
// using the screensaver
function processEnabled() {
	// update context menu text
	var label = JSON.parse(localStorage.enabled) ? 'Disable' : 'Enable';
	chrome.contextMenus.update('ENABLE_MENU', {title: label, contexts: ['browser_action']});
	setBadgeText();
}

// create active period scheduling alarms
// also create a daily alarm to update live photostreams
function processAlarms() {

	var aStart = JSON.parse(localStorage.activeStart);
	var aStop = JSON.parse(localStorage.activeStop);

	if (aStart !== aStop) {
		var startDelayMin = myUtils.getTimeDelta(aStart);
		var stopDelayMin = myUtils.getTimeDelta(aStop);

		chrome.alarms.create('activeStart', {
			delayInMinutes: startDelayMin,
			periodInMinutes: myUtils.MIN_IN_DAY
		});
		chrome.alarms.create('activeStop',{
			delayInMinutes: stopDelayMin,
			periodInMinutes: myUtils.MIN_IN_DAY
		});

		// if we are currently outside of the active range
		// then set inactive state
		if (!myUtils.isInRange(aStart, aStop)) {
			setInactiveState();
		}
	} else {
		chrome.alarms.clear('activeStart');
		chrome.alarms.clear('activeStop');
	}

	// Add daily alarm to update 500px and flickr photos
	chrome.alarms.get('updatePhotos', function(alarm) {
		if (!alarm) {
			chrome.alarms.create('updatePhotos', {
				when: Date.now() + myUtils.MSEC_IN_DAY,
				periodInMinutes: myUtils.MIN_IN_DAY
			});
		}
	});

}

function processKeepAwake() {
	JSON.parse(localStorage.keepAwake) ? chrome.power.requestKeepAwake('display') : chrome.power.releaseKeepAwake();
	processAlarms();
	setBadgeText();
}

function processIdleTime() {
	chrome.idle.setDetectionInterval(parseInt(localStorage.idleTime, 10) * 60);
}

function processUseAuthors() {
	localStorage.removeItem('authorImages');
	if (JSON.parse(localStorage.useAuthors)) {
		gPhotos.loadAuthorImages();
	}
}

function processUseChromecast() {
	localStorage.removeItem('ccImages');
	if (JSON.parse(localStorage.useChromecast)) {
		chromeCast.loadImages();
	}
}

function processUsePopular500px() {
	localStorage.removeItem('popular500pxImages');
	if (JSON.parse(localStorage.usePopular500px)) {
		use500px.loadImages('popular', 'popular500pxImages');
	}
}

function processUseYesterday500px() {
	localStorage.removeItem('yesterday500pxImages');
	if (JSON.parse(localStorage.useYesterday500px)) {
		use500px.loadImages('fresh_yesterday', 'yesterday500pxImages');
	}
}

function processUseInterestingFlickr() {
	localStorage.removeItem('flickrInterestingImages');
	if (JSON.parse(localStorage.useInterestingFlickr)) {
		flickr.loadImages();
	}
}

// Map processing functions to localStorage values
var STATE_MAP =  {
	'enabled': processEnabled,
	'keepAwake': processKeepAwake,
	'activeStart': processKeepAwake,
	'activeStop':  processKeepAwake,
	'allowSuspend': processKeepAwake,
	'idleTime': processIdleTime,
	'useChromecast': processUseChromecast,
	'usePopular500px': processUsePopular500px,
	'useYesterday500px': processUseYesterday500px,
	'useInterestingFlickr': processUseInterestingFlickr,
	'useAuthors': processUseAuthors,
};

function processState(key) {
	var noop = function() {};
	var called = [];
	var fn;

	if (key === 'all') {
		Object.keys(STATE_MAP).forEach(function(ky) {
			fn = STATE_MAP[ky];
			if (called.indexOf(fn) === -1) {
				// track functions we have already called
				called.push(fn);
				return fn();
			}
		});
	} else {
		(STATE_MAP[key] || noop)();
	}
}

// create a screensaver on every display
function _openScreenSavers() {
	chrome.system.display.getInfo(function(displayInfo) {
		for (var i = 0; i < displayInfo.length; i++) {
			_openScreenSaver(displayInfo[i]);
		}
	});
}

// create a screen saver window on the given display
// if no display is specified use the current one
function _openScreenSaver(display) {
	var bounds = {};
	if (display) {
		bounds = display.bounds;
	} else {
		bounds.left = 0;
		bounds.top = 0;
		bounds.width = screen.width;
		bounds.height = screen.height;
	}
	if (!bounds.left && !bounds.top && myUtils.getChromeVersion() >= 44) {
		// Chrome supports fullscreen option on create since version 44
		chrome.windows.create({
			url: '/html/screensaver.html',
			focused: true,
			type: 'popup',
			state: 'fullscreen'
		});
	} else {
		chrome.windows.create({
			url: '/html/screensaver.html',
			left: bounds.left,
			top: bounds.top,
			width: bounds.width,
			height: bounds.height,
			focused: true,
			type: 'popup'
		}, function(win) {
			chrome.windows.update(win.id, {state: 'fullscreen'});
		});
	}
}

// always request display screensaver through this call
function displayScreenSaver(single) {
	closeScreenSavers();
	if (!single && JSON.parse(localStorage.allDisplays)) {
		_openScreenSavers();
	} else {
		_openScreenSaver();
	}
}

// close all the screensavers
function closeScreenSavers() {
	chrome.tabs.query({title: 'Photo Screen Saver Screensaver Page'}, function(t) {
		for (var i = 0; i < t.length; i++) {
			chrome.windows.remove(t[i].windowId);
		}
	});
}

// event: called when extension is installed or updated or Chrome is updated
function onInstalled() {
	// create menus on the right click menu of the extension icon
	chrome.contextMenus.create({type: 'normal', id: 'ENABLE_MENU', title: 'Disable', contexts: ['browser_action']});
	chrome.contextMenus.create({type: 'separator', id: 'SEP_MENU', contexts: ['browser_action']});

	initData();
	processState('all');
}

// event: called when Chrome first starts
function onStartup() {
	processState('all');
}

// event: display or focus options page
function onIconClicked() {
	chrome.tabs.query({title: 'Photo Screen Saver Options Page'}, function(t) {
		t.length ? chrome.tabs.update(t[0].id, {'highlighted': true}) : chrome.tabs.create({url: '../html/options.html'});
	});
}

// event: process the state when someone has changed the storage
function onStorageChanged(event) {
	processState(event.key);
}

// event: add or remove the screensavers as needed
function onIdleStateChanged(state) {
	if (state === 'idle' && isActive()) {
		displayScreenSaver();
	} else {
		// delay close a little to allow time to process mouse and keyboard
		chrome.alarms.create('close', {
			when: Date.now() + 250,
		});
	}
}

// event: alarms triggered
function onAlarm(alarm) {
	switch (alarm.name) {
		case 'activeStart':
			// Don't let display sleep
			if (JSON.parse(localStorage.keepAwake)) {
				chrome.power.requestKeepAwake('display');
			}
			var interval	= parseInt(localStorage.idleTime, 10) * 60;
			chrome.idle.queryState(interval, function(state) {
				// on active start display screensaver if the idle time criteria is met
				if (state === 'idle') {
					displayScreenSaver();
				}
			});
			setBadgeText();
			break;
		case 'activeStop':
			setInactiveState();
			break;
		case 'updatePhotos':
			// get the latest for the live photo streams
			processUsePopular500px();
			processUseYesterday500px();
			processUseInterestingFlickr();
			break;
		case 'close':
			closeScreenSavers();
			break;
		default:
			break;
	}
}

// message: preview the screensaver
function onMessage(request) {
	if (request.preview === 'show') {
		displayScreenSaver(true);
	}
}

function _toggleEnabled() {
	// toggle enabled state
	localStorage.enabled =  !JSON.parse(localStorage.enabled);
	// storage changed not fired on same page as change
	processEnabled();

}

// event: context menu clicked
function onMenuClicked(info) {
	if (info.menuItemId === 'ENABLE_MENU') {
		_toggleEnabled();
	}
}

// event: special key command
function onKeyCommand(cmd) {
	if (cmd === 'toggle-enabled') {
		_toggleEnabled();
	}
}

// listen for extension install or update
chrome.runtime.onInstalled.addListener(onInstalled);

// listen for Chrome starting
chrome.runtime.onStartup.addListener(onStartup);

// listen for click on the icon
chrome.browserAction.onClicked.addListener(onIconClicked);

// listen for changes to the stored data
addEventListener('storage', onStorageChanged, false);

// listen for changes to the idle state of the computer
chrome.idle.onStateChanged.addListener(onIdleStateChanged);

// listen for the keep wake change alarms
chrome.alarms.onAlarm.addListener(onAlarm);

// listen for request to display preview of screensaver
chrome.runtime.onMessage.addListener(onMessage);

// listen for clicks on context menus
chrome.contextMenus.onClicked.addListener(onMenuClicked);

// listen for special keyboard commands
chrome.commands.onCommand.addListener(onKeyCommand);
})();
