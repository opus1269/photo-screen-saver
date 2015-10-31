(function() {
'use strict';

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
		localStorage.showTime = '1'; // 12 hour format
		localStorage.showPhotog = 'true';
		localStorage.usePopular500px = 'false';
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
		localStorage.isPreview = 'false'; // no longer used
		localStorage.windowID = '-1';  // no longer used
	}

	// remove unused variables
	localStorage.removeItem('isPreview');
	localStorage.removeItem('windowID');
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
// also create a daily alarm to update live photostreams
function processAlarms() {

	var kStart = JSON.parse(localStorage.keepStart);
	var kStop = JSON.parse(localStorage.keepStop);

	if (JSON.parse(localStorage.keepAwake) && (kStart !== kStop)) {
		var startDelayMin = myUtils.getTimeDelta(kStart);
		var stopDelayMin = myUtils.getTimeDelta(kStop);

		chrome.alarms.create('keepStart', {
			delayInMinutes: startDelayMin,
			periodInMinutes: myUtils.MIN_IN_DAY
		});
		chrome.alarms.create('keepStop',{
			delayInMinutes: stopDelayMin,
			periodInMinutes: myUtils.MIN_IN_DAY
		});

		// if we are currently outside of the range of the keep awake
		// then let display sleep
		if (!myUtils.isInRange(kStart, kStop)) {
			chrome.power.requestKeepAwake('system');
		}
	} else {
		chrome.alarms.clear('keepStart');
		chrome.alarms.clear('keepStop');
	}

	// Add daily alarm to update 500px and flickr photoS
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
	localStorage.removeItem('authorImages');
	if (JSON.parse(localStorage.useAuthors)) {
		gPhotos.loadAuthorImages(false);
	}
}

function processUseChromecast() {
	localStorage.removeItem('ccImages');
	if (JSON.parse(localStorage.useChromecast)) {
		chromeCast.loadImages(false);
	}
}

function processUsePopular500px() {
	localStorage.removeItem('popular500pxImages');
	if (JSON.parse(localStorage.usePopular500px)) {
		use500px.loadImages(false);
	}
}

function processUseInterestingFlickr() {
	localStorage.removeItem('flickrInterestingImages');
	if (JSON.parse(localStorage.useInterestingFlickr)) {
		flickr.loadImages(flickr.TYPE_ENUM.interesting, false);
	}
}

function processUseFavoriteFlickr() {
	localStorage.removeItem('flickrFavoriteImages');
	if (JSON.parse(localStorage.useFavoriteFlickr)) {
		flickr.loadImages(flickr.TYPE_ENUM.favorite, false);
	}
}

// set state based on the current values in localStorage
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
			case 'useChromecast':
				processUseChromecast();
				break;
			case 'usePopular500px':
				processUsePopular500px();
				break;
			case 'useInterestingFlickr':
				processUseInterestingFlickr();
				break;
			case 'useFavoriteFlickr':
				processUseFavoriteFlickr();
				break;
			case 'useAuthors':
				processUseAuthors();
				break;
		}
	} else {
		processKeepAwake();
		processIdleTime();
		processEnabled();
		processUseChromecast();
		processUsePopular500px();
		processUseInterestingFlickr();
		processUseFavoriteFlickr();
		processUseAuthors();
	}
}

// show a screensaver on every display
function openScreenSavers() {
	chrome.system.display.getInfo(function(displayInfo) {
		for (var i = 0; i < displayInfo.length; i++) {
			openScreenSaver(displayInfo[i]);
		}
	});
}

// create a screen saver window on the given display
// if no display is specified use the current one
function openScreenSaver(display) {
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

// close all the screensavers
function closeScreenSavers() {
	chrome.windows.getAll({windowTypes: ['popup']}, function(windows) {
		for (var i = 0; i < windows.length; i++) {
			chrome.windows.remove(windows[i].id);
		}
	});
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

// event: display or focus options page
function onClicked() {
	chrome.tabs.query({title: 'Photo Screen Saver Options Page'}, function(t) {
		if (!t.length) {
			chrome.tabs.create({url: '../html/options.html'});
		} else {
			chrome.tabs.update(t[0].id, {'highlighted': true});
		}
	});
}

// event: process the state when someone has changed the storage
function onStorageChanged(event) {
	processState(event.key);
}

// event: add or remove the screensavers as needed
function onIdleStateChanged(state) {
	if ((state === 'idle') && JSON.parse(localStorage.enabled)) {
		if (JSON.parse(localStorage.allDisplays)) {
			openScreenSavers();
		} else {
			openScreenSaver();
		}
	} else {
		closeScreenSavers();
	}
}

// event: alarms triggered
function onAlarm(alarm) {
	switch (alarm.name) {
		case 'keepStop':
			if (JSON.parse(localStorage.keepAwake)) {
				// let display sleep, but keep power on
				// so we can reenable
				chrome.power.requestKeepAwake('system');
			}
			break;
		case 'keepStart':
			if (JSON.parse(localStorage.keepAwake)) {
				// Don't let display sleep
				chrome.power.requestKeepAwake('display');
			}
			break;
		case 'updatePhotos':
			// get the latest for the live photo streams
			processUsePopular500px();
			processUseInterestingFlickr();
			processUseFavoriteFlickr();
			break;
	}
}

// message: preview the screensaver
function onMessage(request) {
	if (request.preview === 'show') {
		openScreenSaver();
	}
}

// listen for extension install or update
chrome.runtime.onInstalled.addListener(onInstalled);

// listen for Chrome starting
chrome.runtime.onStartup.addListener(onStartup);

// listen for click on the icon
chrome.browserAction.onClicked.addListener(onClicked);

// listen for changes to the stored data
addEventListener('storage', onStorageChanged, false);

// listen for changes to the idle state of the computer
chrome.idle.onStateChanged.addListener(onIdleStateChanged);

// listen for the keep wake change alarms
chrome.alarms.onAlarm.addListener(onAlarm);

// listen for request to display preview of screensaver
chrome.runtime.onMessage.addListener(onMessage);

})();
