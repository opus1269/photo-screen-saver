/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * JSON utilities
 * @namespace
 */
app.JSONUtils = (function() {
	'use strict';

	new ExceptionHandler();

	return {
		/**
		 * Parse JSON, with exception handling
		 * @param {!string} jsonString - string to parse
		 * @returns {?JSON} JSON Object, null on error
		 * @memberOf app.JSONUtils
		 */
		parse: function(jsonString) {
			let ret = null;
			try {
				ret = JSON.parse(jsonString);
			} catch (err) {
				Chrome.GA.exception(`Caught: JSONUtils.parse: ${err.message}`,
					err.stack, false);
			}
			return ret;
		},

		/**
		 * Return shallow copy of Object
		 * @param {!Object} object - object to copy
		 * @returns {?JSON} JSON Object, null on error
		 * @memberOf app.JSONUtils
		 */
		shallowCopy: function(object) {
			let ret = null;
			const jsonString = JSON.stringify(object);
			if (typeof(jsonString) !== 'undefined') {
				ret = app.JSONUtils.parse(jsonString);
			}
			return ret;
		},
	};
})();
