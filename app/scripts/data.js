/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.Data = (function() {
	'use strict';

	/**
	 * Manage the extensions data
	 * @namespace app.Data
	 */

	const chromep = new ChromePromise();

	/**
	 * Version of localStorage - update when items are added, removed, changed
	 * @type {int}
	 * @default
	 * @const
	 * @private
	 * @memberOf app.Data
	 */
	const _DATA_VERSION = 10;

	/**
	 * A number and associated units
	 * @typedef {Object} UnitValue
	 * @property {number} base - value in base unit
	 * @property {number} display - value in display unit
	 * @property {int} unit - display unit
	 */

	/**
	 * Values for items in localStorage
	 * @typedef {Object} AppData
	 * @property {int} version - version of data
	 * @property {boolean} enabled - is screensaver enabled
	 * @property {UnitValue} idleTime - idle time to display screensaver
	 * @property {UnitValue} transitionTime - time between photos
	 * @property {boolean} skip - ignore extreme aspect ratio photos
	 * @property {boolean} shuffle - randomize photo order
	 * @property {int} photoSizing - photo display type
	 * @property {int} photoTransition - transition animation
	 * @property {int} showTime - time display format
	 * @property {boolean} showPhotog - display name on own photos
	 * @property {string} background - background image
	 * @property {boolean} keepAwake - manage computer poser settings
	 * @property {boolean} chromeFullscreen - don't display over fullscreen
	 * Chrome windows
	 * @property {boolean} allDisplays - show on all displays
	 * @property {string} activeStart - Keep Wake start time '00:00' 24 hr
	 * @property {string} activeStop - Keep Wake stop time '00:00' 24 hr
	 * @property {boolean} allowSuspend - let computer sleep
	 * @property {boolean} useSpaceReddit - use this photo source
	 * @property {boolean} useEarthReddit - use this photo source
	 * @property {boolean} useAnimalReddit - use this photo source
	 * @property {boolean} useEditors500px - use this photo source
	 * @property {boolean} usePopular500px - use this photo source
	 * @property {boolean} useYesterday500px - use this photo source
	 * @property {boolean} useInterestingFlickr - use this photo source
	 * @property {boolean} useChromecast - use this photo source
	 * @property {boolean} useAuthors - use this photo source
	 * @property {boolean} useGoogle - use this photo source
	 * @property {boolean} useSpaceReddit - use this photo source
	 * @property {Array} albumSelections - Users Google Photos to use
	 */

	/**
	 * Default values in localStorage
	 * @type {AppData}
	 * @const
	 * @private
	 * @memberOf app.Data
	 */
	const _DEF_VALUES = {
		'version': _DATA_VERSION,
		'enabled': true,
		'idleTime': {'base': 5, 'display': 5, 'unit': 0}, // minutes
		'transitionTime': {'base': 30, 'display': 30, 'unit': 0}, // seconds
		'skip': true,
		'shuffle': true,
		'photoSizing': 0,
		'photoTransition': 4,
		'showTime': 2, // 24 hr format
		'showPhotog': true,
		'background': 'background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)',
		'keepAwake': false,
		'chromeFullscreen': true,
		'allDisplays': false,
		'activeStart': '00:00', // 24 hr time
		'activeStop': '00:00', // 24 hr time
		'allowSuspend': false,
		'useSpaceReddit': false,
		'useEarthReddit': false,
		'useAnimalReddit': false,
		'useEditors500px': false,
		'usePopular500px': false,
		'useYesterday500px': false,
		'useInterestingFlickr': false,
		'useChromecast': true,
		'useAuthors': false,
		'useGoogle': true,
		'albumSelections': [],
	};

	/**
	 * Set state based on screensaver enabled flag
	 * Note: this does not effect the keep awake settings so you could
	 * use the extension as a display keep awake scheduler without
	 * using the screensaver
	 * @private
	 * @memberOf app.Data
	 */
	function _processEnabled() {
		// update context menu text
		const label = app.Storage.getBool('enabled') ?
			app.Utils.localize('disable') : app.Utils.localize('enable');
		app.Alarm.updateBadgeText();
		chromep.contextMenus.update('ENABLE_MENU', {
			title: label,
		}).catch((err) => {});
	}

	/**
	 * Set power scheduling features
	 * @private
	 * @memberOf app.Data
	 */
	function _processKeepAwake() {
		app.Storage.getBool('keepAwake') ?
			chrome.power.requestKeepAwake('display') :
			chrome.power.releaseKeepAwake();
		app.Alarm.updateRepeatingAlarms();
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set wait time for screen saver display after machine is idle
	 * @private
	 * @memberOf app.Data
	 */
	function _processIdleTime() {
		chrome.idle.setDetectionInterval(app.Utils.getIdleSeconds());
	}

	/**
	 * Get default time format based on locale
	 * @returns {int} 12 or 24
	 * @private
	 * @memberOf app.Data
	 */
	function _getTimeFormat() {
		let ret = 2; // 24 hr
		const format = app.Utils.localize('time_format');
		if (format && (format === '12')) {
			ret = 1;
		}
		return ret;
	}

	/**
	 * Set the 'os' value
	 * @returns {Promise} err on failure
	 * @private
	 * @memberOf app.Data
	 */
	function _setOS() {
		return chromep.runtime.getPlatformInfo().then((info) => {
			app.Storage.set('os', info.os);
			return Promise.resolve();
		});
	}

	/**
	 * Save the [_DEF_VALUES]{@link app.Data._DEF_VALUES} items, if they
	 * do not already exist
	 * @private
	 * @memberOf app.Data
	 */
	function _addDefaults() {
		Object.keys(_DEF_VALUES).forEach(function(key) {
			if (app.Storage.get(key) === null) {
				app.Storage.set(key, _DEF_VALUES[key]);
			}
		});
	}

	/**
	 * Convert a setting-slider value due to addition of units
	 * @param {!string} key - localStorage key
	 * @private
	 * @memberOf app.Data
	 */
	function _convertSliderValue(key) {
		const value = app.Storage.get(key);
		if (value) {
			const newValue = {
				base: value,
				display: value,
				unit: 0,
			};
			app.Storage.set(key, newValue);
		}
	}

	return {
		/**
		 * Initialize the data saved in localStorage
		 * @memberOf app.Data
		 */
		initialize: function() {
			_addDefaults();

			// set operating system
			_setOS().catch((err) => {});

			// set time format based on locale
			app.Storage.set('showTime', _getTimeFormat());

			// update state
			app.Data.processState();
		},

		/**
		 * Update the data saved in localStorage
		 * @memberOf app.Data
		 */
		update: function() {
			// New items, changes, and removal of unused items can take place
			// here when the version changes
			const oldVersion = app.Storage.getInt('version');

			if (_DATA_VERSION > oldVersion) {
				// update version number
				app.Storage.set('version', _DATA_VERSION);
			}

			if (oldVersion < 10) {
				// was setting this without quotes before
				const oldOS = localStorage.getItem('os');
				if (oldOS) {
					app.Storage.set('os', oldOS);
				}
			}

			if (oldVersion < 8) {
				// change setting-slider values due to adding units
				_convertSliderValue('transitionTime');
				_convertSliderValue('idleTime');
			}

			_addDefaults();

			// update state
			app.Data.processState();
		},

		/**
		 * Restore default values for data saved in localStorage
		 * @memberOf app.Data
		 */
		restoreDefaults: function() {
			Object.keys(_DEF_VALUES).forEach(function(key) {
				if ((key !== 'useGoogle') &&
					(key !== 'albumSelections')) {
					// skip Google photos settings
					app.Storage.set(key, _DEF_VALUES[key]);
				}
			});

			// restore default time format based on locale
			app.Storage.set('showTime', _getTimeFormat());

			// update state
			app.Data.processState();
		},

		/**
		 * Process changes to localStorage items
		 * @param {string} [key='all'] - the item that changed
		 * @memberOf app.Data
		 */
		processState: function(key='all') {
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
				// process everything
				Object.keys(STATE_MAP).forEach(function(ky) {
					fn = STATE_MAP[ky];
					return fn();
				});
				// process photo SOURCES
				app.PhotoSource.processAll();
				// set os, if not already
				if (!app.Storage.get('os')) {
					_setOS().catch((err) => {});
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
	};
})();
