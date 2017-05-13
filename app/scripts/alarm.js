/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.Alarm = (function() {
	'use strict';

	/**
	 * Manage the chrome.alarm
	 * @namespace app.Alarm
	 */

	/**
	 * Triggered when screen saver is active
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const ALARM_ACTIVATE = 'activeStart';

	/**
	 * Triggered when screen saver is deactivated
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const ALARM_DEACTIVATE = 'activeStop';

	/**
	 * Triggered when selected photos should be updated from Web
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const ALARM_UPDATE_PHOTOS = 'updatePhotos';

	/**
	 * Triggered when the icon's Badge text should be set
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const ALARM_BADGE = 'setBadgeText';

	/**
	 * minutes in a day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const MIN_IN_DAY = 60 * 24;

	/**
	 * milli-seconds in a day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Alarm
	 */
	const MSEC_IN_DAY = MIN_IN_DAY * 60 * 1000;

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
			delayMin = MIN_IN_DAY + delayMin;
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
		chrome.idle.queryState(interval, function(state) {
			// display screensaver if the idle time criteria is met
			if (state === 'idle') {
				app.SSControl.display(false);
			}
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
			case ALARM_ACTIVATE:
				// entering active time range of keep awake
				_setActiveState();
				break;
			case ALARM_DEACTIVATE:
				// leaving active time range of keep awake
				_setInactiveState();
				break;
			case ALARM_UPDATE_PHOTOS:
				// get the latest for the live photo streams
				app.PhotoSource.processDaily();
				break;
			case ALARM_BADGE:
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

				chrome.alarms.create(ALARM_ACTIVATE, {
					delayInMinutes: startDelayMin,
					periodInMinutes: MIN_IN_DAY,
				});
				chrome.alarms.create(ALARM_DEACTIVATE, {
					delayInMinutes: stopDelayMin,
					periodInMinutes: MIN_IN_DAY,
				});

				// if we are currently outside of the active range
				// then set inactive state
				if (!_isInRange(aStart, aStop)) {
					_setInactiveState();
				}
			} else {
				chrome.alarms.clear(ALARM_ACTIVATE);
				chrome.alarms.clear(ALARM_DEACTIVATE);
			}

			// Add daily alarm to update photo sources that request this
			chrome.alarms.get(ALARM_UPDATE_PHOTOS, function(alarm) {
				if (!alarm) {
					chrome.alarms.create(ALARM_UPDATE_PHOTOS, {
						when: Date.now() + MSEC_IN_DAY,
						periodInMinutes: MIN_IN_DAY,
					});
				}
			});
		},

		/**
		 * Set the icon badge text
		 * @memberOf app.Alarm
		 */
		updateBadgeText: function() {
			// delay setting a little to make sure range check is good
			chrome.alarms.create(ALARM_BADGE, {when: Date.now() + 250});
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


