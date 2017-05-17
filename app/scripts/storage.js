/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.Storage = (function() {
	'use strict';

	/**
	 * Manage items in localStorage
	 * @namespace app.Storage
	 */

	return {
		/**
		 * Get a JSON parsed value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?JSON} JSON object, null if key does not exist
		 * @memberOf app.Storage
		 */
		get: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = JSON.parse(item);
			}
			return item;
		},

		/**
		 * Get integer value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?int} value as integer
		 * @memberOf app.Storage
		 */
		getInt: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = parseInt(item, 10);
			}
			return item;
		},

		/**
		 * Get boolean value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?boolean} value as boolean
		 * @memberOf app.Storage
		 */
		getBool: function(key) {
			return app.Storage.get(key);
		},

		/**
		 * JSON stringify and save a value to localStorage
		 * @param {!string} key - key to set value for
		 * @param {?Object} value - new value, if null remove item
		 * @memberOf app.Storage
		 */
		set: function(key, value) {
			if (value !== null) {
				localStorage.setItem(key, JSON.stringify(value));
			} else {
				localStorage.removeItem(key);
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
