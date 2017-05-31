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
