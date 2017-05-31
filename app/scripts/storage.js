/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Manage items in localStorage
 * @namespace
 */
app.Storage = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Notify listeners of a value change
	 * @param {!string} key - key that changed
	 * @param {?Object} value - new value, null if item removed
	 * @private
	 */
	function _notify(key, value) {
		// notify listeners
		const msg = app.JSONUtils.shallowCopy(app.Msg.VALUE_CHANGED);
		msg.key = key;
		msg.value = value;
		app.Msg.send(msg);
	}

	return {
		/**
		 * Get a JSON parsed value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?JSON} JSON object, null if key does not exist
		 * @memberOf app.Storage
		 */
		get: function(key) {
			let item = localStorage.getItem(key);
			let value = null;
			if (item !== null) {
				value = app.JSONUtils.parse(item);
			}
			return value;
		},

		/**
		 * Get integer value from localStorage
		 * @param {!string} key - key to get value for
		 * @param {?int} [def=null] - optional value to return, if NaN
		 * @returns {int} value as integer, NaN on error
		 * @memberOf app.Storage
		 */
		getInt: function(key, def = null) {
			let item = localStorage.getItem(key);
			let value = parseInt(item, 10);
			if (Number.isNaN(value)) {
				value = (def === null) ? value : def;
				if (def === null) {
					app.GA.error(`NaN value for: ${key}`, 'Storage.getInt');
				}
			}
			return value;
		},

		/**
		 * Get boolean value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?boolean} value as boolean, null if key does not exist
		 * @memberOf app.Storage
		 */
		getBool: function(key) {
			return app.Storage.get(key);
		},

		/**
		 * JSON stringify and save a value to localStorage
		 * @param {!string} key - key to set value for
		 * @param {?Object} [value=null] - new value, if null remove item
		 * @param {?boolean} [notify=true] - if true, notify listeners
		 * @memberOf app.Storage
		 */
		set: function(key, value = null, notify = true) {
			let val = value;
			if (value === null) {
				localStorage.removeItem(key);
			} else {
				val = JSON.stringify(value);
				localStorage.setItem(key, val);
			}
			if (notify) {
				_notify(key, val);
			}
		},

		/**
		 * Save a value to localStorage only if there is enough room
		 * @param {!string} key - localStorage Key
		 * @param {Object} value - value to save
		 * @param {string} [keyBool] - key to a boolean value
		 *                 that is true if the primary key has non-empty value
		 * @returns {boolean} true if value was set successfully
		 * @memberOf app.Storage
		 */
		safeSet: function(key, value, keyBool) {
			let ret = true;
			const oldValue = app.Storage.get(key);
			try {
				app.Storage.set(key, value);
			} catch (e) {
				ret = false;
				if (oldValue) {
					// revert to old value
					app.Storage.set(key, oldValue);
				}
				if (keyBool) {
					// revert to old value
					if (oldValue && oldValue.length) {
						app.Storage.set(keyBool, true);
					} else {
						app.Storage.set(keyBool, false);
					}
				}
				// notify listeners
				app.Msg.send(app.Msg.STORAGE_EXCEEDED).catch(() => {});
			}
			return ret;
		},
	};
})();
