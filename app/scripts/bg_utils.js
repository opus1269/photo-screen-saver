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

	/**
	 * Convert string to time
	 *
	 * @param {String} value format: 'hh:mm' 24 hour time
	 * @returns {Integer} time in milliSec from base
	 * @private
	 *
	 */
	function _getTime(value) {
		var date = new Date();

		date.setHours(parseInt(value.substr(0, 2)));
		date.setMinutes(parseInt(value.substr(3, 2)));
		date.setSeconds(0);
		date.setMilliseconds(0);
		return date.getTime();
	}

	/**
	 * Calculate time delta from now on a 24 hr basis
	 *
	 * @param {String} value format: 'hh:mm' 24 hour time
	 * @returns {Integer} time delta in minutes
	 * @private
	 */
	function _getTimeDelta(value) {
		var curTime = Date.now();
		var time = _getTime(value);
		var delayMin = (time - curTime) / 1000 / 60;

		if (delayMin < 0) {
			delayMin = MIN_IN_DAY + delayMin;
		}
		return delayMin;
	}

	/**
	 * Determine if current time is between start and stop, inclusive
	 *
	 * @param {String} start format: 'hh:mm' 24 hour time
	 * @param {String} stop format: 'hh:mm' 24 hour time
	 * @returns {Boolean} true if in the given range
	 * @private
	 */
	function _isInRange(start, stop) {
		var curTime = Date.now();
		var startTime = _getTime(start);
		var stopTime = _getTime(stop);
		var ret = false;

		if (start === stop) {
			return true;
		}

		if (stopTime > startTime) {
			if ((curTime >= startTime) && (curTime <= stopTime)) {
				ret = true;
			}
		} else {
			if ((curTime >= startTime) || (curTime <= stopTime)) {
				ret = true;
			}
		}
		return ret;
	}

	/***
	 * Determine if there is a full screen chrome window running on a display
	 *
	 * @param {DisplayInfo} display a connected display
	 * @param callback (boolean) true if there is a full screen window on the display
	 * @private
	 */
	function _hasFullscreen(display, callback) {
		// callback(boolean)
		callback = callback || function() {};

		if (myUtils.getBool('chromeFullscreen')) {
			chrome.windows.getAll({populate: false}, function(wins) {
				var win;
				var left = display ? display.bounds.left : 0;
				var top = display ? display.bounds.top : 0;
				for (var i = 0; i < wins.length; i++) {
					win = wins[i];
					if (win.state === 'fullscreen' && (!display || (win.top === top && win.left === left))) {
						callback(true);
						return;
					}
				}
				callback(false);
			});
		} else {
			callback(false);
		}
	}

	/**
	 * Get the idle time in seconds
	 *
	 * @returns {Integer} idle time in seconds
	 * @private
	 */
	function _getIdleSeconds() {
		var idle = myUtils.getJSON('idleTime');
		return idle.base * 60;
	}

	/**
	 * Open a screen saver window on the given display
	 *
	 * @param {DisplayInfo} display a connected display
	 * @private
	 */
	function _openScreenSaver(display) {
		_hasFullscreen(display, function(isTrue) {
			// don't display if there is a fullscreen window
			var left = display ? display.bounds.left : 0;
			var top = display ? display.bounds.top : 0;
			if (!isTrue) {
				if (myUtils.getChromeVersion() >= 44 && !display) {
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
						left: left,
						top: top,
						width: 1,
						height: 1,
						focused: true,
						type: 'popup'
					}, function(win) {
						chrome.windows.update(win.id, {state: 'fullscreen'});
					});
				}
			}
		});
	}

	/**
	 * Open a screensaver on every display
	 *
	 * @private
	 */
	function _openScreenSavers() {
		chrome.system.display.getInfo(function(displayInfo) {
			if (displayInfo.length === 1) {
				_openScreenSaver(null);
			} else {
				for (var i = 0; i < displayInfo.length; i++) {
					_openScreenSaver(displayInfo[i]);
				}
			}
		});
	}

	/**
	 * Set the icon badge text
	 *
	 * @private
	 */
	function _updateBadgeText() {
		// delay setting a little to make sure range check is good
		chrome.alarms.create('setBadgeText', {when: Date.now() + 250});
	}

	/**
	 * Set the repeating alarms states
	 *
	 * @private
	 */
	function _updateRepeatingAlarms() {
		var keepAwake = myUtils.getBool('keepAwake');
		var aStart = myUtils.getBool('activeStart');
		var aStop = myUtils.getBool('activeStop');

		// create keep awake active period scheduling alarms
		if (keepAwake && aStart !== aStop) {
			var startDelayMin = _getTimeDelta(aStart);
			var stopDelayMin = _getTimeDelta(aStop);

			chrome.alarms.create('activeStart', {
				delayInMinutes: startDelayMin,
				periodInMinutes: MIN_IN_DAY
			});
			chrome.alarms.create('activeStop', {
				delayInMinutes: stopDelayMin,
				periodInMinutes: MIN_IN_DAY
			});

			// if we are currently outside of the active range
			// then set inactive state
			if (!_isInRange(aStart, aStop)) {
				bgUtils.setInactiveState();
			}
		} else {
			chrome.alarms.clear('activeStart');
			chrome.alarms.clear('activeStop');
		}

		// Add daily alarm to update photo sources that request this
		chrome.alarms.get('updatePhotos', function(alarm) {
			if (!alarm) {
				chrome.alarms.create('updatePhotos', {
					when: Date.now() + MSEC_IN_DAY,
					periodInMinutes: MIN_IN_DAY
				});
			}
		});
	}

	/**
	 * Set state based on screen saver enabled flag
	 *
	 * Note: this does not effect the keep awake settings so you could
	 * use the extension as a display keep awake scheduler without
	 * using the screensaver
	 *
	 * @private
	 */
	function _processEnabled() {
		// update context menu text
		var label = myUtils.getBool('enabled') ? 'Disable' : 'Enable';
		_updateBadgeText();
		chrome.contextMenus.update('ENABLE_MENU', {title: label}, function() {
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
			}
		});
	}

	/**
	 * Set power scheduling features
	 *
	 * @private
	 */
	function _processKeepAwake() {
		myUtils.getBool('keepAwake') ?
			chrome.power.requestKeepAwake('display') :
			chrome.power.releaseKeepAwake();
		_updateRepeatingAlarms();
		_updateBadgeText();
	}

	/**
	 * Set wait time for screen saver display after machine is idle
	 *
	 * @private
	 */
	function _processIdleTime() {
		chrome.idle.setDetectionInterval(_getIdleSeconds());
	}

	return {

		MIN_IN_DAY: MIN_IN_DAY,

		MSEC_IN_DAY: MSEC_IN_DAY,

		/**
		 * Initialize the localStorage items
		 *
		 * @param {Boolean} restore if true force restore to defaults
		 *
		 */
		initData: function(restore) {
			// using local storage as a quick and dirty replacement for MVC
			// not using chrome.storage 'cause the async nature of it complicates things
			// just remember to use parse methods because all values are strings

			var str;
			var trans;
			var idle;

			var oldVersion = localStorage.getItem('version');

			localStorage.version = '8';

			var VALS = {
				'enabled': 'true',
				'idleTime': '{"base": 5, "display": 5, "unit": 0}', // minutes
				'transitionTime': '{"base": 30, "display": 30, "unit": 0}', // seconds
				'skip': 'true',
				'shuffle': 'true',
				'photoSizing': '0',
				'photoTransition': '4',
				'showTime': '1', // 12 hr format
				'showPhotog': 'true',
				'background': '"background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)"',
				'keepAwake': 'false',
				'chromeFullscreen': 'true',
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
				'albumSelections': '[]'
			};

			if (oldVersion < 8) {
				// change setting-slider values due to adding units
				trans = localStorage.getItem('transitionTime');
				if (trans) {
					str = '{"base": ' + trans + ', "display": ' + trans + ', "unit": 0}';
					localStorage.setItem('transitionTime', str);
				}
				idle = localStorage.getItem('idleTime');
				if (idle) {
					str = '{"base": ' + idle + ', "display": ' + idle + ', "unit": 0}';
					localStorage.setItem('idleTime', str);
				}
			}

			if (restore) {
				Object.keys(VALS).forEach(function(key) {
					if ((key !== 'useGoogle') && (key !== 'albumSelections')) {
						// skip Google photos settings
						localStorage.setItem(key, VALS[key]);
					}
				});
			} else {
				Object.keys(VALS).forEach(function(key) {
					if (!localStorage.getItem(key)) {
						localStorage.setItem(key, VALS[key]);
					}
				});
			}

			// remove unused variables
			localStorage.removeItem('isPreview');
			localStorage.removeItem('windowID');
			localStorage.removeItem('useFavoriteFlickr');
			localStorage.removeItem('useFlickr');
			localStorage.removeItem('useFlickrSelections');
			localStorage.removeItem('use500px');
			localStorage.removeItem('use500pxSelections');
			localStorage.removeItem('useReddit');
			localStorage.removeItem('useRedditSelections');
		},

		/**
		 * Display the options tab
		 */
		showOptionsTab: function() {
			// send message to the option tab to focus it.
			chrome.runtime.sendMessage({window: 'highlight'}, null, function(response) {
				if (!response) {
					// no one listening, create it
					chrome.tabs.create({url: '../html/options.html'});
				}
			});
		},

		/**
		 * Determine if the screen saver can be displayed
		 *
		 * @returns {Boolean} true if can display
		 */
		isActive: function() {
			var enabled = myUtils.getBool('enabled');
			var keepAwake = myUtils.getBool('keepAwake');
			var aStart = myUtils.getBool('activeStart');
			var aStop = myUtils.getBool('activeStop');

			// do not display if screen saver is not enabled or
			// keepAwake scheduler is enabled and is in the inactive range
			return !(!enabled || (keepAwake && !_isInRange(aStart, aStop)));

		},

		/**
		 * Set state when the screensaver is in the active time range
		 *
		 */
		setActiveState: function() {
			if (myUtils.getBool('keepAwake')) {
				chrome.power.requestKeepAwake('display');
			}
			var interval = _getIdleSeconds();
			chrome.idle.queryState(interval, function(state) {
				// display screensaver if the idle time criteria is met
				if (state === 'idle') {
					bgUtils.displayScreenSaver(false);
				}
			});
			_updateBadgeText();
		},

		/**
		 * Set state when the screensaver is in the inactive time range
		 *
		 */
		setInactiveState: function() {
			myUtils.getBool('allowSuspend') ? chrome.power.releaseKeepAwake() :
				chrome.power.requestKeepAwake('system');
			bgUtils.closeScreenSavers();
			_updateBadgeText();
		},

		/**
		 * Toggle enabled state of the screen saver
		 *
		 */
		toggleEnabled: function() {
			localStorage.enabled = !myUtils.getBool('enabled');
			// storage changed event not fired on same page as the change
			_processEnabled();
		},

		/**
		 * Process changes to localStorage items
		 *
		 * @param {string} key the item that changed 'all' for everything
		 *
		 */
		processState: function(key) {
			// Map processing functions to localStorage values
			var STATE_MAP = {
				'enabled': _processEnabled,
				'keepAwake': _processKeepAwake,
				'activeStart': _processKeepAwake,
				'activeStop': _processKeepAwake,
				'allowSuspend': _processKeepAwake,
				'idleTime': _processIdleTime
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

		/**
		 * Display the screen saver(s)
		 *
		 * !Important: Always request screensaver through this call
		 *
		 * @param {Boolean} single if true only show on one display
		 */
		displayScreenSaver: function(single) {
			if (!single && myUtils.getBool('allDisplays')) {
				_openScreenSavers();
			} else {
				_openScreenSaver(null);
			}
		},

		/**
		 * Close all the screen saver windows
		 */
		closeScreenSavers: function() {
			// send message to the screen savers to close themselves
			chrome.runtime.sendMessage({window: 'close'});
		}

	};
})();
