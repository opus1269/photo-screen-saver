/*
@@license
*/
/*exported bgUtils*/
var bgUtils = (function() {
	'use strict';

	// minutes in day
	var MIN_IN_DAY = 60 * 24;

	// milli-seconds in day
	var MSEC_IN_DAY = MIN_IN_DAY * 60 * 1000;

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

		if (start === stop) {
			return true;
		}

		if (stopTime > startTime) {
			if ((curTime >= startTime) && (curTime < stopTime)) {
				ret = true;
			}
		} else {
			if ((curTime >= startTime) || (curTime < stopTime)) {
				ret = true;
			}
		}
		return ret;
	}

	return {

		MIN_IN_DAY: MIN_IN_DAY,

		MSEC_IN_DAY: MSEC_IN_DAY,

		// initialize the data in local storage
		initData: function() {
			// using local storage as a quick and dirty replacement for MVC
			// not using chrome.storage 'cause the async nature of it complicates things
			// just remember to use parse methods because all values are strings

			localStorage.version = '5';

			var VALS = {
				'enabled': 'true',
				'idleTime': '10', // minutes
				'transitionTime': '30', // seconds
				'skip': 'true',
				'shuffle': 'true',
				'photoSizing': '0',
				'photoTransition': '4',
				'showTime': '1', // 12 hr format default
				'showPhotog': 'true',
				'background': '"background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)"',
				'keepAwake': 'false',
				'allDisplays': 'false',
				'activeStart': '"00:00"', // 24 hr time
				'activeStop': '"00:00"', // 24 hr time
				'allowSuspend': 'false',
				'useSpaceReddit': 'false',
				'useEarthReddit': 'false',
				'useAnimalReddit': 'false',
				'useEditors500px': 'false',
				'usePopular500px': 'false',
				'useYesterday500px': 'false',
				'useInterestingFlickr': 'false',
				'useChromecast': 'true',
				'useAuthors': 'false',
				'useGoogle': 'true',
				'albumSelections': '[]',
				'useFlickr': 'true',
				'useFlickrSelections': '[]',
				'use500px': 'true',
				'use500pxSelections': '[]',
				'useReddit': 'true',
				'useRedditSelections': '[]',
			};

			Object.keys(VALS).forEach(function(key) {
				if (!localStorage.getItem(key)) {
					localStorage.setItem(key, VALS[key]);
				}
			});

			// remove unused variables
			localStorage.removeItem('isPreview');
			localStorage.removeItem('windowID');
			localStorage.removeItem('useFavoriteFlickr');
		},

		// return true if screensaver can be displayed
		isActive: function() {
			var enabled = JSON.parse(localStorage.enabled);
			var keepAwake = JSON.parse(localStorage.keepAwake);
			var aStart = JSON.parse(localStorage.activeStart);
			var aStop = JSON.parse(localStorage.activeStop);

			if (!enabled || (keepAwake && !isInRange(aStart, aStop))) {
				// not enabled or keepAwke is enabled and is in inactive range
				return false;
			}
			return true;
		},

		// set the text label displayed on the icon
		setBadgeText: function() {
			var text = '';
			if (JSON.parse(localStorage.enabled)) {
				text = bgUtils.isActive() ? '' : 'SLP';
			} else {
				text = JSON.parse(localStorage.keepAwake) ? 'PWR' : 'OFF';
			}
			chrome.browserAction.setBadgeText({text: text});
		},

		// set state when the screensaver is in the active range
		setActiveState: function() {
			if (JSON.parse(localStorage.keepAwake)) {
				chrome.power.requestKeepAwake('display');
			}
			var interval = parseInt(localStorage.idleTime, 10) * 60;
			chrome.idle.queryState(interval, function(state) {
				// display screensaver if the idle time criteria is met
				if (state === 'idle') {
					bgUtils.displayScreenSaver();
				}
			});
			bgUtils.setBadgeText();
		},

		// set state when the screensaver is in the non-active range
		setInactiveState: function() {
			JSON.parse(localStorage.allowSuspend) ? chrome.power.releaseKeepAwake() : chrome.power.requestKeepAwake('system');
			bgUtils.closeScreenSavers();
			bgUtils.setBadgeText();
		},

		// toggle enabled state
		toggleEnabled: function() {
			localStorage.enabled =  !JSON.parse(localStorage.enabled);
			// storage changed event not fired on same page as the change
			bgUtils.processEnabled();
		},

		// enabled state of screensaver
		// note: this does not effect the keep awake settings so you could
		// use the extension as a display keep awake scheduler without
		// using the screensaver
		processEnabled: function() {
			// update context menu text
			var label = JSON.parse(localStorage.enabled) ? 'Disable' : 'Enable';
			chrome.contextMenus.update('ENABLE_MENU', {title: label});
			bgUtils.setBadgeText();
		},

		processKeepAwake: function() {
			JSON.parse(localStorage.keepAwake) ? chrome.power.requestKeepAwake('display') : chrome.power.releaseKeepAwake();
			bgUtils.processAlarms();
			bgUtils.setBadgeText();
		},

		processIdleTime: function() {
			chrome.idle.setDetectionInterval(parseInt(localStorage.idleTime, 10) * 60);
		},

		// create active period scheduling alarms
		// also create a daily alarm to update live photostreams
		processAlarms: function() {
			var keepAwake = JSON.parse(localStorage.keepAwake);
			var aStart = JSON.parse(localStorage.activeStart);
			var aStop = JSON.parse(localStorage.activeStop);

			if (keepAwake && aStart !== aStop) {
				var startDelayMin = getTimeDelta(aStart);
				var stopDelayMin = getTimeDelta(aStop);

				chrome.alarms.create('activeStart', {
					delayInMinutes: startDelayMin,
					periodInMinutes: MIN_IN_DAY
				});
				chrome.alarms.create('activeStop',{
					delayInMinutes: stopDelayMin,
					periodInMinutes: MIN_IN_DAY
				});

				// if we are currently outside of the active range
				// then set inactive state
				if (!isInRange(aStart, aStop)) {
					bgUtils.setInactiveState();
				}
			} else {
				chrome.alarms.clear('activeStart');
				chrome.alarms.clear('activeStop');
			}

			// Add daily alarm to update 500px and flickr photos
			chrome.alarms.get('updatePhotos', function(alarm) {
				if (!alarm) {
					chrome.alarms.create('updatePhotos', {
						when: Date.now() + MSEC_IN_DAY,
						periodInMinutes: MIN_IN_DAY
					});
				}
			});
		},

		// process changes to localStorage settings
		processState: function(key) {
			// Map processing functions to localStorage values
			var STATE_MAP =  {
				'enabled': bgUtils.processEnabled,
				'keepAwake': bgUtils.processKeepAwake,
				'activeStart': bgUtils.processKeepAwake,
				'activeStop':  bgUtils.processKeepAwake,
				'allowSuspend': bgUtils.processKeepAwake,
				'idleTime': bgUtils.processIdleTime
			};
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
				// process photo SOURCES
				photoSources.processAll();
			} else {
				// individual change
				if (photoSources.contains(key)) {
					photoSources.process(key);
				} else {
					(STATE_MAP[key] || noop)();
				}
			}
		},

		// always request display screensaver through this call
		displayScreenSaver: function(single) {
			bgUtils.closeScreenSavers();
			if (!single && JSON.parse(localStorage.allDisplays)) {
				_openScreenSavers();
			} else {
				_openScreenSaver();
			}
		},

		// close all the screensavers
		closeScreenSavers: function() {
			chrome.tabs.query({title: 'Photo Screen Saver Screensaver Page'}, function(t) {
				for (var i = 0; i < t.length; i++) {
					chrome.windows.remove(t[i].windowId);
				}
			});
		}

	};
})();
