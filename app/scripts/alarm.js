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
app.Alarm = (function() {
	'use strict';

	/**
	 * Manage the chrome.alarm
	 * @namespace Alarm
	 */

	/**
	 * Triggered when screen saver is active
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const ALARM_ACTIVATE = 'activeStart';

	/**
	 * Triggered when screen saver is deactivated
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const ALARM_DEACTIVATE = 'activeStop';

	/**
	 * Triggered when selected photos should be updated from Web
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const ALARM_UPDATE_PHOTOS = 'updatePhotos';

	/**
	 * Triggered when the icon's Badge text should be set
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const ALARM_BADGE = 'setBadgeText';

	/**
	 * minutes in a day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const MIN_IN_DAY = 60 * 24;

	/**
	 * milli-seconds in a day
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const MSEC_IN_DAY = MIN_IN_DAY * 60 * 1000;

	/**
	 * Convert string to time
	 * @param {String} value - format: 'hh:mm' 24 hour time
	 * @return {int} time in mSec from epoch
	 * @private
	 * @memberOf Alarm
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
	 * @param {String} value - format: 'hh:mm' 24 hour time
	 * @return {int} time delta in minutes
	 * @private
	 * @memberOf Alarm
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
	 * @param {String} start - format: 'hh:mm' 24 hour time
	 * @param {String} stop - format: 'hh:mm' 24 hour time
	 * @return {Boolean} true if in the given range
	 * @private
	 * @memberOf Alarm
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
	 * @memberOf Alarm
	 */
	function _setActiveState() {
		if (app.Utils.getBool('keepAwake')) {
			chrome.power.requestKeepAwake('display');
		}
		const interval = app.BGUtils.getIdleSeconds();
		chrome.idle.queryState(interval, function(state) {
			// display screensaver if the idle time criteria is met
			if (state === 'idle') {
				app.BGUtils.displayScreenSaver(false);
			}
		});
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set state when the screensaver is in the inactive time range
	 * @private
	 * @memberOf Alarm
	 */
	function _setInactiveState() {
		if (app.Utils.getBool('allowSuspend')) {
			chrome.power.releaseKeepAwake();
		} else {
			chrome.power.requestKeepAwake('system');
		}
		app.BGUtils.closeScreenSavers();
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set the Badge text on the icon
	 * @private
	 * @memberOf Alarm
	 */
	function _setBadgeText() {
		let text = '';
		if (app.Utils.getBool('enabled')) {
			text = app.Alarm.isActive() ? '' : 'SLP';
		} else {
			text = app.Utils.getBool('keepAwake') ? 'PWR' : 'OFF';
		}
		chrome.browserAction.setBadgeText({text: text});
	}

	/**
	 * Event: Fired when an alarm has elapsed.
	 * @see https://developer.chrome.com/apps/alarms#event-onAlarm
	 * @param {object} alarm - details on alarm
	 * @private
	 * @memberOf Alarm
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

	/**
	 * Listen for alarms
	 */
	chrome.alarms.onAlarm.addListener(_onAlarm);

	return {
		/**
		 * Set the repeating alarms states
		 * @memberOf Alarm
		 */
		updateRepeatingAlarms: function() {
			const keepAwake = app.Utils.getBool('keepAwake');
			const aStart = app.Utils.getBool('activeStart');
			const aStop = app.Utils.getBool('activeStop');

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
		 * @memberOf Alarm
		 */
		updateBadgeText: function() {
			// delay setting a little to make sure range check is good
			chrome.alarms.create(ALARM_BADGE, {when: Date.now() + 250});
		},

		/**
		 * Determine if the screen saver can be displayed
		 * @return {Boolean} true if can display
		 * @memberOf Alarm
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
	};
})();


