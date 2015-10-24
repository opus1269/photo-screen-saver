(function() {
'use strict';

// minutes in day
var MIN_IN_DAY = 60 * 24;

// display or focus options page
chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.query({title: 'Photo Screen Saver Options Page'}, function(t) {
		if (!t.length) {
			chrome.tabs.create({url: '../html/options.html'});
		} else {
			chrome.tabs.update(t[0].id, {'highlighted': true});
		}
	});
});

// initialize the data in local storage
function initData() {
	// using local storage as a quick and dirty replacement for MVC
	// not using chrome.storage 'cause the async nature of it complicates things
	// just remember to use parse methods because all values are strings
	var oldVer = parseInt(localStorage.version,10);

	// latest version
	localStorage.version = '2';

	// Add the new version 2 values
	if (!oldVer || (oldVer < 2)) {
		localStorage.allDisplays = 'false';
		localStorage.keepStart = '"00:00"'; // 24 hr time
		localStorage.keepStop = '"00:00"';  // 24 hr time
		localStorage.showPhotog = 'true';
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
		localStorage.photoTransition = '0';
		localStorage.useChromecast = 'true';
		localStorage.useAuthors = 'false';
		localStorage.useGoogle = 'true';
		localStorage.albumSelections = '[]';
		localStorage.isPreview = 'false'; // no longer used
		localStorage.windowID = '-1';  // no longer used
	}

	// removed unused variables
	localStorage.removeItem('isPreview');
	localStorage.removeItem('windowID');
}

// from:
// http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
function getChromeVersion() {
	var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
	return raw ? parseInt(raw[2], 10) : false;
}

// get time
// value format: '00:00'
function getTime(value) {
	var date = new Date();

	date.setHours(value.substr(0,2));
	date.setMinutes(value.substr(3,2));
	return date.getTime();
}

// calculate delta in time from now in minutes on a 24 hr basis
// value format: '00:00'
function getTimeDelta(value) {
	var curTime = Date.now();
	var time = getTime(value);
	var delayMin = (time - curTime) / 1000 / 60;

	if (delayMin < 0) {
		delayMin = MIN_IN_DAY + delayMin;
	}
	return delayMin;
}

// is the current time between start and stop
function isInRange(start, stop) {
	var curTime = Date.now();
	var startTime = getTime(start);
	var stopTime = getTime(stop);
	var ret = false;

	if (stopTime > startTime) {
		if ((curTime > startTime) && (curTime < stopTime)) {
			ret = true;
		}
	} else {
		if ((curTime > startTime) || (curTime < stopTime)) {
			ret = true;
		}
	}
	return ret;
}

// enabled state of screensaver
// note: this does not effect the keep awake settings so you could
// use the extension as a display keep awake scheduler without
// using the screensaver
function processEnabled() {
	if (JSON.parse(localStorage.enabled)) {
		chrome.browserAction.setBadgeText({text: ''});
	} else {
		chrome.browserAction.setBadgeText({text: 'OFF'});
	}
}

// create keep awake scheduling alarms
// if a time range has been specified for when to keep the screen awake,
// schedule repeating alarms
function processAlarms() {
	var kStart = JSON.parse(localStorage.keepStart);
	var kStop = JSON.parse(localStorage.keepStop);

	if (JSON.parse(localStorage.keepAwake) && (kStart !== kStop)) {
		var startDelayMin = getTimeDelta(kStart);
		var stopDelayMin = getTimeDelta(kStop);

		chrome.alarms.create('keepStart', {
			delayInMinutes: startDelayMin,
			periodInMinutes: MIN_IN_DAY
		});
		chrome.alarms.create('keepStop',{
			delayInMinutes: stopDelayMin,
			periodInMinutes: MIN_IN_DAY
		});

		// if we are currently outside of the range of the keep awake
		// then let display sleep
		if (!isInRange(kStart, kStop)) {
			chrome.power.requestKeepAwake('system');
		}
	} else {
		chrome.alarms.clear('keepStart');
		chrome.alarms.clear('keepStop');
	}
}

function processKeepAwake() {
	if (JSON.parse(localStorage.keepAwake)) {
		chrome.power.requestKeepAwake('display');
	} else {
		chrome.power.releaseKeepAwake();
	}
	processAlarms();
}

function processIdleTime() {
	chrome.idle.setDetectionInterval(parseInt(localStorage.idleTime, 10) * 60);
}

function processUseAuthors() {
	localStorage.removeItem('badAuthorImages');
	localStorage.removeItem('authorImages');
	if (JSON.parse(localStorage.useAuthors)) {
		gPhotos.preloadAuthorImages();
	}
}

function processUseChromecast() {
	localStorage.removeItem('badCCImages');
	if (JSON.parse(localStorage.useChromecast)) {
		chromeCast.preloadImages();
	}
}

// set state based on the current values in localStorage
// TODO: Do we want useGoogle here?
function processState(key) {
	if (key) {
		switch (key) {
			case 'enabled':
				processEnabled();
				break;
			case 'keepAwake':
			case 'keepStart':
			case 'keepStop':
				processKeepAwake();
				break;
			case 'idleTime':
				processIdleTime();
				break;
			case 'useAuthors':
				processUseAuthors();
				break;
			case 'useChromecast':
				processUseChromecast();
				break;
		}
	} else {
		processKeepAwake();
		processIdleTime();
		processEnabled();
		processUseAuthors();
		processUseChromecast();
	}
}

// show a screensaver on every display
function showScreenSavers() {
	chrome.system.display.getInfo(function(displayInfo) {
		for (var i = 0; i < displayInfo.length; i++) {
			showScreenSaver(displayInfo[i]);
		}
	});
}

// create a screen saver window on the given display
// if no display is specified use the current one
function showScreenSaver(display) {
	var bounds = {};
	if (display) {
		bounds = display.bounds;
	} else {
		bounds.left = 0;
		bounds.top = 0;
		bounds.width = screen.width;
		bounds.height = screen.height;
	}
	if (!bounds.left && !bounds.top && getChromeVersion() >= 44) {
		// Chrome now supports fullscreen option on create
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
			chrome.windows.update(win.id, {state: 'fullscreen', focused: true});
		});
	}
}

// event: called when extension is installed or updated or Chrome is updated
function onInstalled() {
	initData();
	processState(null);
}

// event: called when Chrome first starts
function onStartup() {
	processState(null);
}

// event: process the state when someone has changed the storage
function onStorageChanged(event) {
	processState(event.key);
}

// event: add or remove the screensavers as needed
function onIdleStateChanged(state) {
	if ((state === 'idle') && JSON.parse(localStorage.enabled)) {
		if (JSON.parse(localStorage.allDisplays)) {
			showScreenSavers();
		} else {
			showScreenSaver();
		}
	} else {
		chrome.windows.getAll({windowTypes: ['popup']}, function(windows) {
			for (var i = 0; i < windows.length; i++) {
				chrome.windows.remove(windows[i].id);
			}
		});
	}
}

// event: process requests to change the keep awake mode
function onAlarm(alarm) {
	if (alarm.name === 'keepStop') {
		if (JSON.parse(localStorage.keepAwake)) {
			// let display sleep, but keep power on
			// so we can reenable
			chrome.power.requestKeepAwake('system');
		}
	} else if (alarm.name === 'keepStart') {
		if (JSON.parse(localStorage.keepAwake)) {
			// Don't let display sleep
			chrome.power.requestKeepAwake('display');
		}
	}
}

// message: preview the screensaver
function onPreview(request) {
	if (request.preview === 'show') {
		showScreenSaver();
	}
}

// listen for extension install or update
chrome.runtime.onInstalled.addListener(onInstalled);

// listen for Chrome starting
chrome.runtime.onStartup.addListener(onStartup);

// listen for changes to the stored data
addEventListener('storage', onStorageChanged, false);

// listen for changes to the idle state of the computer
chrome.idle.onStateChanged.addListener(onIdleStateChanged);

// listen for the keep wake change alarms
chrome.alarms.onAlarm.addListener(onAlarm);

// listen for request to display preview of screensaver
chrome.runtime.onMessage.addListener(onPreview);

})();
