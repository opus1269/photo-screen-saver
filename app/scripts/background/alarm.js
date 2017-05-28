/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Manage alarms from the chrome.alarms API
 * @see https://developer.chrome.com/apps/alarms
 * @namespace
 */
app.Alarm = (function() {
	'use strict';

	new ExceptionHandler();

	const chromep = new ChromePromise();

	/**
	 * Alarms triggered by chrome.alarms
	 * @typedef {Object} Alarms
	 * @property {string} ACTIVATE - screen saver is active
	 * @property {string} DEACTIVATE - screen saver is not activate
	 * @property {string} UPDATE_PHOTOS - photo sources should be updated
	 * @property {string} BADGE_TEXT - icon's Badge text should be set
	 * @const
	 * @private
	 * @memberOf app.Alarm
	 */
	const _ALARMS = {
		'ACTIVATE': 'ACTIVATE',
		'DEACTIVATE': 'DEACTIVATE',
		'UPDATE_PHOTOS': 'UPDATE_PHOTOS',
		'BADGE_TEXT': 'BADGE_TEXT',
	};

	/**
	 * Time constants
	 * @typedef {Object} Time
	 * @property {int} MIN_IN_DAY - minutes in a day
	 * @property {int} MSEC_IN_DAY - milliSeconds in a day
	 * @const
	 * @private
	 * @memberOf app.Alarm
	 */
	const _TIME = {
		'MIN_IN_DAY': 60 * 24,
		'MSEC_IN_DAY': 60 * 60 * 24 * 1000,
	};

	/**
	 * Convert string to time
	 * @param {string} value - format: 'hh:mm' 24 hour time
	 * @returns {int} time in mSec from epoch
	 * @private
	 * @memberOf app.Alarm
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
	 * @param {string} value - format: 'hh:mm' 24 hour time
	 * @returns {int} time delta in minutes
	 * @private
	 * @memberOf app.Alarm
	 */
	function _getTimeDelta(value) {
		const curTime = Date.now();
		const time = _getTime(value);
		let delayMin = (time - curTime) / 1000 / 60;

		if (delayMin < 0) {
			delayMin = _TIME.MIN_IN_DAY + delayMin;
		}
		return delayMin;
	}

	/**
	 * Determine if current time is between start and stop, inclusive
	 * @param {string} start - format: 'hh:mm' 24 hour time
	 * @param {string} stop - format: 'hh:mm' 24 hour time
	 * @returns {boolean} true if in the given range
	 * @private
	 * @memberOf app.Alarm
	 */
	function _isInRange(start, stop) {
		const curTime = Date.now();
		const startTime = _getTime(start);
		const stopTime = _getTime(stop);
		let ret = false;

		if (start === stop) {
			ret = true;
		} else if (stopTime > startTime) {
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
	 * Set state when the screensaver is in the active time range
	 * @private
	 * @memberOf app.Alarm
	 */
	function _setActiveState() {
		if (app.Storage.getBool('keepAwake')) {
			chrome.power.requestKeepAwake('display');
		}
		const interval = app.Utils.getIdleSeconds();
		chromep.idle.queryState(interval).then((state) => {
			// display screensaver if the idle time criteria is met
			if (state === 'idle') {
				app.SSControl.display(false);
			}
			return null;
		}).catch((err) => {
			app.GA.error(err.message, 'Alarm._setActiveState');
		});
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set state when the screensaver is in the inactive time range
	 * @private
	 * @memberOf app.Alarm
	 */
	function _setInactiveState() {
		if (app.Storage.getBool('allowSuspend')) {
			chrome.power.releaseKeepAwake();
		} else {
			chrome.power.requestKeepAwake('system');
		}
		app.SSControl.close();
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set the Badge text on the icon
	 * @private
	 * @memberOf app.Alarm
	 */
	function _setBadgeText() {
		let text = '';
		if (app.Storage.getBool('enabled')) {
			text = app.Alarm.isActive() ?
				'' : app.Utils.localize('sleep_abbrev');
		} else {
			text = app.Storage.getBool('keepAwake') ?
				app.Utils.localize('power_abbrev') :
				app.Utils.localize('off_abbrev');
		}
		chrome.browserAction.setBadgeText({text: text});
	}

	/**
	 * Event: Fired when an alarm has elapsed.
	 * @see https://developer.chrome.com/apps/alarms#event-onAlarm
	 * @param {Object} alarm - details on alarm
	 * @private
	 * @memberOf app.Alarm
	 */
	function _onAlarm(alarm) {
		switch (alarm.name) {
			case _ALARMS.ACTIVATE:
				// entering active time range of keep awake
				_setActiveState();
				break;
			case _ALARMS.DEACTIVATE:
				// leaving active time range of keep awake
				_setInactiveState();
				break;
			case _ALARMS.UPDATE_PHOTOS:
				// get the latest for the live photo streams
				app.PhotoSource.processDaily();
				break;
			case _ALARMS.BADGE_TEXT:
				// set the icons text
				_setBadgeText();
				break;
			default:
				break;
		}
	}

	// Listen for alarms
	chrome.alarms.onAlarm.addListener(_onAlarm);

	return {
		/**
		 * Set the repeating alarms states
		 * @memberOf app.Alarm
		 */
		updateRepeatingAlarms: function() {
			const keepAwake = app.Storage.getBool('keepAwake');
			const aStart = app.Storage.getBool('activeStart');
			const aStop = app.Storage.getBool('activeStop');

			// create keep awake active period scheduling alarms
			if (keepAwake && (aStart !== aStop)) {
				const startDelayMin = _getTimeDelta(aStart);
				const stopDelayMin = _getTimeDelta(aStop);

				chrome.alarms.create(_ALARMS.ACTIVATE, {
					delayInMinutes: startDelayMin,
					periodInMinutes: _TIME.MIN_IN_DAY,
				});
				chrome.alarms.create(_ALARMS.DEACTIVATE, {
					delayInMinutes: stopDelayMin,
					periodInMinutes: _TIME.MIN_IN_DAY,
				});

				// if we are currently outside of the active range
				// then set inactive state
				if (!_isInRange(aStart, aStop)) {
					_setInactiveState();
				}
			} else {
				chrome.alarms.clear(_ALARMS.ACTIVATE);
				chrome.alarms.clear(_ALARMS.DEACTIVATE);
			}

			// Add daily alarm to update photo sources that request this
			chromep.alarms.get(_ALARMS.UPDATE_PHOTOS).then((alarm) => {
				if (!alarm) {
					chrome.alarms.create(_ALARMS.UPDATE_PHOTOS, {
						when: Date.now() + _TIME.MSEC_IN_DAY,
						periodInMinutes: _TIME.MIN_IN_DAY,
					});
				}
				return null;
			}).catch((err) => {
				app.GA.error(err.message,
					'chromep.alarms.get(_ALARMS.UPDATE_PHOTOS)');
			});
		},

		/**
		 * Set the icon badge text
		 * @memberOf app.Alarm
		 */
		updateBadgeText: function() {
			// delay setting a little to make sure range check is good
			chrome.alarms.create(_ALARMS.BADGE_TEXT, {
				when: Date.now() + 250,
			});
		},

		/**
		 * Determine if the screen saver can be displayed
		 * @returns {boolean} true if can display
		 * @memberOf app.Alarm
		 */
		isActive: function() {
			const enabled = app.Storage.getBool('enabled');
			const keepAwake = app.Storage.getBool('keepAwake');
			const aStart = app.Storage.get('activeStart');
			const aStop = app.Storage.get('activeStop');

			// do not display if screen saver is not enabled or
			// keepAwake scheduler is enabled and is in the inactive range
			return !(!enabled || (keepAwake && !_isInRange(aStart, aStop)));
		},
	};
})();


