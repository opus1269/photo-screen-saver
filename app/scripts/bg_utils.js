/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its contributors
 *  may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 *  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 *  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 *  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 *  OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
window.app = window.app || {};
app.BGUtils = (function() {
	'use strict';

	/**
	 * Helper methods for Background script
	 * @namespace BGUtils
	 */

	/**
	 * minutes in day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf BGUtils
	 */
	const MIN_IN_DAY = 60 * 24;

	/**
	 * milli-seconds in day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf BGUtils
	 */
	const MSEC_IN_DAY = MIN_IN_DAY * 60 * 1000;

	/**
	 * Convert string to time
	 * @param {String} value format: 'hh:mm' 24 hour time
	 * @return {Integer} time in milliSec from base
	 * @private
	 * @memberOf BGUtils
	 */
	function _getTime(value) {
		const date = new Date();

		date.setHours(parseInt(value.substr(0, 2)));
		date.setMinutes(parseInt(value.substr(3, 2)));
		date.setSeconds(0);
		date.setMilliseconds(0);
		return date.getTime();
	}

	/**
	 * Calculate time delta from now on a 24 hr basis
	 * @param {String} value format: 'hh:mm' 24 hour time
	 * @return {int} time delta in minutes
	 * @private
	 * @memberOf BGUtils
	 */
	function _getTimeDelta(value) {
		const curTime = Date.now();
		const time = _getTime(value);
		let delayMin = (time - curTime) / 1000 / 60;

		if (delayMin < 0) {
			delayMin = MIN_IN_DAY + delayMin;
		}
		return delayMin;
	}

	/**
	 * Determine if current time is between start and stop, inclusive
	 * @param {String} start format: 'hh:mm' 24 hour time
	 * @param {String} stop format: 'hh:mm' 24 hour time
	 * @return {Boolean} true if in the given range
	 * @private
	 * @memberOf BGUtils
	 */
	function _isInRange(start, stop) {
		const curTime = Date.now();
		const startTime = _getTime(start);
		const stopTime = _getTime(stop);
		let ret = false;

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

	/**
	 * Determine if there is a full screen chrome window running on a display
	 * @param {object} display a connected display
	 * @param {function} callback (boolean) - true if there is a full screen
	 * window on the display
	 * @private
	 * @memberOf BGUtils
	 */
	function _hasFullscreen(display, callback) {
		callback = callback || function() {};

		if (app.Utils.getBool('chromeFullscreen')) {
			chrome.windows.getAll({populate: false}, function(wins) {
				const left = display ? display.bounds.left : 0;
				const top = display ? display.bounds.top : 0;
				for (let i = 0; i < wins.length; i++) {
					const win = wins[i];
					if ((win.state === 'fullscreen') &&
						(!display || (win.top === top && win.left === left))) {
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
	 * @return {Integer} idle time in seconds
	 * @private
	 * @memberOf BGUtils
	 */
	function _getIdleSeconds() {
		const idle = app.Utils.getJSON('idleTime');
		return idle.base * 60;
	}

	/**
	 * Open a screen saver window on the given display
	 * @param {object} display a connected display
	 * @private
	 * @memberOf BGUtils
	 */
	function _openScreenSaver(display) {
		_hasFullscreen(display, function(isTrue) {
			// don't display if there is a fullscreen window
			const left = display ? display.bounds.left : 0;
			const top = display ? display.bounds.top : 0;
			if (!isTrue) {
				if (app.Utils.getChromeVersion() >= 44 && !display) {
					// Chrome supports fullscreen option on create since
					// version 44
					chrome.windows.create({
						url: '/html/screensaver.html',
						focused: true,
						type: 'popup',
						state: 'fullscreen',
					});
				} else {
					chrome.windows.create({
						url: '/html/screensaver.html',
						left: left,
						top: top,
						width: 1,
						height: 1,
						focused: true,
						type: 'popup',
					}, function(win) {
						chrome.windows.update(win.id, {state: 'fullscreen'});
					});
				}
			}
		});
	}

	/**
	 * Open a screensaver on every display
	 * @private
	 * @memberOf BGUtils
	 */
	function _openScreenSavers() {
		chrome.system.display.getInfo(function(displayInfo) {
			if (displayInfo.length === 1) {
				_openScreenSaver(null);
			} else {
				for (let i = 0; i < displayInfo.length; i++) {
					_openScreenSaver(displayInfo[i]);
				}
			}
		});
	}

	/**
	 * Set the icon badge text
	 * @private
	 * @memberOf BGUtils
	 */
	function _updateBadgeText() {
		// delay setting a little to make sure range check is good
		chrome.alarms.create('setBadgeText', {when: Date.now() + 250});
	}

	/**
	 * Set the repeating alarms states
	 * @private
	 * @memberOf BGUtils
	 */
	function _updateRepeatingAlarms() {
		const keepAwake = app.Utils.getBool('keepAwake');
		const aStart = app.Utils.getBool('activeStart');
		const aStop = app.Utils.getBool('activeStop');

		// create keep awake active period scheduling alarms
		if (keepAwake && aStart !== aStop) {
			const startDelayMin = _getTimeDelta(aStart);
			const stopDelayMin = _getTimeDelta(aStop);

			chrome.alarms.create('activeStart', {
				delayInMinutes: startDelayMin,
				periodInMinutes: MIN_IN_DAY,
			});
			chrome.alarms.create('activeStop', {
				delayInMinutes: stopDelayMin,
				periodInMinutes: MIN_IN_DAY,
			});

			// if we are currently outside of the active range
			// then set inactive state
			if (!_isInRange(aStart, aStop)) {
				app.BGUtils.setInactiveState();
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
					periodInMinutes: MIN_IN_DAY,
				});
			}
		});
	}

	/**
	 * Set state based on screen saver enabled flag
	 * Note: this does not effect the keep awake settings so you could
	 * use the extension as a display keep awake scheduler without
	 * using the screensaver
	 * @private
	 * @memberOf BGUtils
	 */
	function _processEnabled() {
		// update context menu text
		const label = app.Utils.getBool('enabled') ? 'Disable' : 'Enable';
		_updateBadgeText();
		chrome.contextMenus.update('ENABLE_MENU', {title: label}, function() {
			if (chrome.runtime.lastError) {
				// noinspection UnnecessaryReturnStatementJS
				return;
			}
		});
	}

	/**
	 * Set power scheduling features
	 * @private
	 * @memberOf BGUtils
	 */
	function _processKeepAwake() {
		app.Utils.getBool('keepAwake') ?
			chrome.power.requestKeepAwake('display') :
			chrome.power.releaseKeepAwake();
		_updateRepeatingAlarms();
		_updateBadgeText();
	}

	/**
	 * Set wait time for screen saver display after machine is idle
	 * @private
	 * @memberOf BGUtils
	 */
	function _processIdleTime() {
		chrome.idle.setDetectionInterval(_getIdleSeconds());
	}

	return {

		MIN_IN_DAY: MIN_IN_DAY,

		MSEC_IN_DAY: MSEC_IN_DAY,

		/**
		 * Initialize the localStorage items
		 * @param {Boolean} restore - if true, restore to defaults
		 * @memberOf BGUtils
		 */
		initData: function(restore) {
			// using local storage as a quick and dirty replacement for MVC
			// not using chrome.storage 'cause the async nature of it
			// complicates things
			// just remember to use parse methods because all values are strings

			const oldVersion = localStorage.getItem('version');

			localStorage.version = '9';

			const VALS = {
				'enabled': 'true',
				'idleTime': '{"base": 5, "display": 5, "unit": 0}', // minutes
				'transitionTime':
					'{"base": 30, "display": 30, "unit": 0}', // seconds
				'skip': 'true',
				'shuffle': 'true',
				'photoSizing': '0',
				'photoTransition': '4',
				'showTime': '1', // 12 hr format
				'showPhotog': 'true',
				'background':
					'"background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)"',
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
				'albumSelections': '[]',
			};

			if (oldVersion < 8) {
				let str;
				let trans;
				let idle;

				// change setting-slider values due to adding units
				trans = localStorage.getItem('transitionTime');
				if (trans) {
					str = '{"base": ' + trans + ', "display": ' + trans +
						', "unit": 0}';
					localStorage.setItem('transitionTime', str);
				}
				idle = localStorage.getItem('idleTime');
				if (idle) {
					str = '{"base": ' + idle + ', "display": ' + idle +
						', "unit": 0}';
					localStorage.setItem('idleTime', str);
				}
			}

			if (restore) {
				// restore defaults
				Object.keys(VALS).forEach(function(key) {
					if ((key !== 'useGoogle') &&
						(key !== 'albumSelections') &&
						(key !== 'os')) {
						// skip Google photos settings and os
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
		 * @memberOf BGUtils
		 */
		showOptionsTab: function() {
			// send message to the option tab to focus it.
			chrome.runtime.sendMessage({
				message: 'highlight',
			}, null, function(response) {
				if (!response) {
					// no one listening, create it
					chrome.tabs.create({url: '../html/options.html'});
				}
			});
		},

		/**
		 * Set the Badge text on the icon
		 * @memberOf BGUtils
		 */
		setBadgeText: function() {
			let text = '';
			if (app.Utils.getBool('enabled')) {
				text = app.BGUtils.isActive() ? '' : 'SLP';
			} else {
				text = app.Utils.getBool('keepAwake') ? 'PWR' : 'OFF';
			}
			chrome.browserAction.setBadgeText({text: text});
		},

		/**
		 * Determine if the screen saver can be displayed
		 * @return {Boolean} true if can display
		 * @memberOf BGUtils
		 */
		isActive: function() {
			const enabled = app.Utils.getBool('enabled');
			const keepAwake = app.Utils.getBool('keepAwake');
			const aStart = app.Utils.getJSON('activeStart');
			const aStop = app.Utils.getJSON('activeStop');

			// do not display if screen saver is not enabled or
			// keepAwake scheduler is enabled and is in the inactive range
			return !(!enabled || (keepAwake && !_isInRange(aStart, aStop)));
		},

		/**
		 * Determine if the screen saver is currently showing
		 * @param {function} callback - callback(isShowing)
		 * @memberOf BGUtils
		 */
		isShowing: function(callback) {
			// callback(isShowing)
			callback = callback || function() {};

			// send message to the screen saver to see if he is around
			chrome.runtime.sendMessage({
				message: 'isShowing',
			}, null, function(response) {
				if (response) {
					// screen saver responded
					callback(true);
				} else {
					callback(false);
				}
			});
		},

		/**
		 * Set state when the screensaver is in the active time range
		 * @memberOf BGUtils
		 */
		setActiveState: function() {
			if (app.Utils.getBool('keepAwake')) {
				chrome.power.requestKeepAwake('display');
			}
			const interval = _getIdleSeconds();
			chrome.idle.queryState(interval, function(state) {
				// display screensaver if the idle time criteria is met
				if (state === 'idle') {
					app.BGUtils.displayScreenSaver(false);
				}
			});
			_updateBadgeText();
		},

		/**
		 * Set state when the screensaver is in the inactive time range
		 * @memberOf BGUtils
		 */
		setInactiveState: function() {
			const suspend = app.Utils.getBool('allowSuspend');
			suspend ? chrome.power.releaseKeepAwake() :
				chrome.power.requestKeepAwake('system');
			app.BGUtils.closeScreenSavers();
			_updateBadgeText();
		},

		/**
		 * Toggle enabled state of the screen saver
		 * @memberOf BGUtils
		 */
		toggleEnabled: function() {
			localStorage.enabled = !app.Utils.getBool('enabled');
			// storage changed event not fired on same page as the change
			_processEnabled();
		},

		/**
		 * Process changes to localStorage items
		 * @param {string} key the item that changed 'all' for everything
		 * @memberOf BGUtils
		 */
		processState: function(key) {
			// Map processing functions to localStorage values
			const STATE_MAP = {
				'enabled': _processEnabled,
				'keepAwake': _processKeepAwake,
				'activeStart': _processKeepAwake,
				'activeStop': _processKeepAwake,
				'allowSuspend': _processKeepAwake,
				'idleTime': _processIdleTime,
			};
			const noop = function() {};
			let fn;

			if (key === 'all') {
				Object.keys(STATE_MAP).forEach(function(ky) {
					fn = STATE_MAP[ky];
					return fn();
				});
				// process photo SOURCES
				app.PhotoSource.processAll();
				// set os, if not already
				if (!localStorage.getItem('os')) {
					chrome.runtime.getPlatformInfo(function(info) {
						localStorage.setItem('os', info.os);
					});
				}
			} else {
				// individual change
				if (app.PhotoSource.contains(key)) {
					app.PhotoSource.process(key, function() {});
				} else {
					(STATE_MAP[key] || noop)();
				}
			}
		},

		/**
		 * Display the screen saver(s)
		 * !Important: Always request screensaver through this call
		 * @param {Boolean} single if true only show on one display
		 * @memberOf BGUtils
		 */
		displayScreenSaver: function(single) {
			if (!single && app.Utils.getBool('allDisplays')) {
				_openScreenSavers();
			} else {
				_openScreenSaver(null);
			}
		},

		/**
		 * Close all the screen saver windows
		 * @memberOf BGUtils
		 */
		closeScreenSavers: function() {
			// send message to the screen savers to close themselves
			chrome.runtime.sendMessage({
				message: 'close',
			}, function(response) {});
		},

	};
})();
