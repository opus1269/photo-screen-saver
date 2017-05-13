/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.BGUtils = (function() {
	'use strict';

	/**
	 * Helper methods for Background script
	 * @namespace app.BGUtils
	 */

	/**
	 * Version of localStorage - update when items are added, removed, changed
	 * @type {int}
	 * @default
	 * @const
	 * @private
	 * @memberOf app.BGUtils
	 */
	const DATA_VERSION = 10;

	/**
	 * Default values in localStorage
	 * @type {{enabled: boolean, version: int,
	 * idleTime: {}, transitionTime: {}, skip: boolean,
	 * shuffle: boolean, photoSizing: number, photoTransition: number,
	 * showTime: number, showPhotog: boolean, background: string,
	 * keepAwake: boolean, chromeFullscreen: boolean, allDisplays: boolean,
	 * activeStart: string, activeStop: string, allowSuspend: boolean,
	 * useSpaceReddit: boolean, useEarthReddit: boolean,
	 * useAnimalReddit: boolean, useEditors500px: boolean,
	 * usePopular500px: boolean, useYesterday500px: boolean,
	 * useInterestingFlickr: boolean, useChromecast: boolean,
	 * useAuthors: boolean, useGoogle: boolean, albumSelections: Array}}
	 * @const
	 * @private
	 * @memberOf app.BGUtils
	 */
	const DEF_VALUES = {
		'version': DATA_VERSION,
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
	 * Set state based on screen saver enabled flag
	 * Note: this does not effect the keep awake settings so you could
	 * use the extension as a display keep awake scheduler without
	 * using the screensaver
	 * @private
	 * @memberOf app.BGUtils
	 */
	function _processEnabled() {
		// update context menu text
		const label = app.Storage.getBool('enabled') ?
			app.Utils.localize('disable') : app.Utils.localize('enable');
		app.Alarm.updateBadgeText();
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
	 * @memberOf app.BGUtils
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
	 * @memberOf app.BGUtils
	 */
	function _processIdleTime() {
		chrome.idle.setDetectionInterval(app.Utils.getIdleSeconds());
	}

	/**
	 * Get default time format based on locale
	 * @returns {int} 12 or 24
	 * @private
	 * @memberOf app.BGUtils
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
	 * Save the [DEF_VALUES]{@link app.BGUtils.DEF_VALUES} array to localStorage
	 * @private
	 * @memberOf app.BGUtils
	 */
	function _saveDefaults() {
		Object.keys(DEF_VALUES).forEach(function(key) {
			if (app.Storage.get(key) === null) {
				app.Storage.set(key, DEF_VALUES[key]);
			}
		});
	}

	/**
	 * Convert a setting-slider value due to addition of units
	 * @param {!string} key - localStorage key
	 * @private
	 * @memberOf app.BGUtils
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
		 * @memberOf app.BGUtils
		 */
		initializeData: function() {
			_saveDefaults();

			// set operating system
			chrome.runtime.getPlatformInfo(function(info) {
				app.Storage.set('os', info.os);
			});

			// set time format based on locale
			app.Storage.set('showTime', _getTimeFormat());

			// update state
			app.BGUtils.processState('all');
		},

		/**
		 * Update the data saved in localStorage
		 * @memberOf app.BGUtils
		 */
		updateData: function() {
			// New items, changes, and removal of unused items can take place
			// here when the version changes
			const oldVersion = app.Storage.getInt('version');

			if (DATA_VERSION > oldVersion) {
				// update version number
				app.Storage.set('version', DATA_VERSION);
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

			_saveDefaults();

			// update state
			app.BGUtils.processState('all');
		},

		/**
		 * Restore defaults for data saved in localStorage
		 * @memberOf app.BGUtils
		 */
		restoreDefaults: function() {
			Object.keys(DEF_VALUES).forEach(function(key) {
				if ((key !== 'useGoogle') &&
					(key !== 'albumSelections')) {
					// skip Google photos settings
					app.Storage.set(key, DEF_VALUES[key]);
				}
			});

			// restore default time format based on locale
			app.Storage.set('showTime', _getTimeFormat());

			// update state
			app.BGUtils.processState('all');
		},

		/**
		 * Display the options tab
		 * @memberOf app.BGUtils
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
		 * Toggle enabled state of the screen saver
		 * @memberOf app.BGUtils
		 */
		toggleEnabled: function() {
			app.Storage.set('enabled', !app.Storage.getBool('enabled'));
			// storage changed event not fired on same page as the change
			_processEnabled();
		},

		/**
		 * Process changes to localStorage items
		 * @param {string} key the item that changed 'all' for everything
		 * @memberOf app.BGUtils
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
				if (!app.Storage.get('os')) {
					chrome.runtime.getPlatformInfo(function(info) {
						app.Storage.set('os', info.os);
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
	};
})();
