/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

(function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Time Class
	 * @property {int} _hr - 24 hour time
	 * @property {int} _min - minutes
	 * @alias app.Time
	 */
	app.Time = class Time {
		/**
		 * Create a new Time
		 * @param {?string} [timeString=null] - in '00:00' format, if null
		 * use current Date
		 * @constructor
		 */
		constructor(timeString = null) {
			this._parse(timeString);
		}

		/**
		 * Minutes in day
		 * @returns {int} value
		 */
		static get MIN_IN_DAY() {
			return 60 * 24;
		}

		/**
		 * Milliseconds in day
		 * @returns {int} value
		 */
		static get MSEC_IN_DAY() {
			return app.Time.MIN_IN_DAY * 60 * 1000;
		}

		/**
		 * Convert string to current time
		 * @param {!string} timeString - in '00:00' format
		 * @returns {int} time in milliSeconds from epoch
		 */
		static getTime(timeString) {
			const date = new Date();
			const time = new Time(timeString);
			date.setHours(time._hr);
			date.setMinutes(time._min);
			date.setSeconds(0);
			date.setMilliseconds(0);
			return date.getTime();
		}

		/**
		 * Calculate time delta from now on a 24hr basis
		 * @param {string} timeString - in '00:00' format
		 * @returns {int} time delta in minutes
		 */
		static getTimeDelta(timeString) {
			const curTime = Date.now();
			const time = app.Time.getTime(timeString);
			let delayMin = (time - curTime) / 1000 / 60;

			if (delayMin < 0) {
				delayMin = app.Time.MIN_IN_DAY + delayMin;
			}
			return delayMin;
		}

		/**
		 * Determine if current time is between start and stop, inclusive
		 * @param {string} start - in '00:00' format
		 * @param {string} stop - in '00:00' format
		 * @returns {boolean} true if in the given range
		 */
		static isInRange(start, stop) {
			const curTime = Date.now();
			const startTime = app.Time.getTime(start);
			const stopTime = app.Time.getTime(stop);
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
		 * Get time as string suitable for display, including AM/PM if 12hr
		 * @param {!string} timeString - in '00:00' format
		 * @param {?int} [frmt=null] - optional format, overrides storage value
		 * @returns {!string} display string
		 * @static
		 */
		static getStringFull(timeString, frmt = null) {
			const time = new Time(timeString);
			return time.toString(frmt);
		}

		/**
		 * Get current time suitable for display w/o AM/PM if 12hr
		 * @returns {!string} display string
		 * @static
		 */
		static getStringShort() {
			const time = new Time();
			let timeString = time.toString();
			// strip off AM/PM
			if (timeString.endsWith('M')) {
				// strip off AM/PM
				timeString = timeString.substring(0, timeString.length - 3);
			}
			return timeString;
		}

		/**
		 * Determine if user wants 24 hr time
		 * @param {?int} [frmt=null] - optional format, overrides storage value
		 * @returns {boolean} true for 24 hour time
		 * @static
		 */
		static is24Hr(frmt = null) {
			let ret = false;
			let format = app.Storage.getInt('showTime', 0);
			if (frmt !== null) {
				format = frmt;
			}
			const localeTime = app.Utils.localize('time_format');
			if (format === 2) {
				// time display 24hr
				ret = true;
			} else if ((format === 0) && (localeTime === '24')) {
				// time display off, locale time 24
				ret = true;
			}
			return ret;
		}

		/**
		 * Parse time string
		 * @param {string} timeString - in '00:00' format
		 * @private
		 */
		_parse(timeString) {
			if (timeString === null) {
				const date = new Date();
				this._hr = date.getHours();
				this._min = date.getMinutes();
			} else {
				this._hr = parseInt(timeString.substr(0, 2), 10);
				this._min = parseInt(timeString.substr(3, 2), 10);
			}
		}

		/**
		 * Get string representation of Time
		 * @param {?int} [frmt=null] - optional format, overrides storage value
		 * @returns {string} As string
		 */
		toString(frmt = null) {
			let ret;
			const date = new Date();
			date.setHours(this._hr, this._min);
			if (Time.is24Hr(frmt)) {
				ret = date.toLocaleTimeString(navigator.language, {
					hour: 'numeric',
					minute: '2-digit',
					hour12: false,
				});
			} else {
				ret = date.toLocaleTimeString('en-us', {
					hour: 'numeric',
					minute: '2-digit',
					hour12: true,
				});
			}
			return ret;
		}
	};
})();
