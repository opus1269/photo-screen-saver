/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
// noinspection ThisExpressionReferencesGlobalObjectJS
(function(window, factory) {
	window.ExceptionHandler = factory(window);
}(this, function(window) {
	'use strict';

	return ExceptionHandler;

	/**
	 * Log Exceptions with analytics. Include: new ExceptionHandler()<br />
	 * at top of every js file
	 * @constructor
	 * @alias ExceptionHandler
	 */
	function ExceptionHandler() {
		if (typeof window.onerror === 'object') {
			// global error handler
			window.onerror = function(message, url, line, col, errObject) {
				if (app && app.GA) {
					let msg = message;
					let stack = null;
					if (errObject && errObject.message && errObject.stack) {
						msg = errObject.message;
						stack = errObject.stack;
					}
					app.GA.exception(msg, stack);
				}
			};
		}
	}
}));
