/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
/**
 * Wrapper for chrome messages
 * @namespace
 */
app.Msg = (function() {
	'use strict';

	const chromep = new ChromePromise();

	const SCREENSAVER_SHOW = {
		message: 'showScreensaver',
	};

	const SCREENSAVER_CLOSE = {
		message: 'close',
	};

	const SCREENSAVER_IS_SHOWING = {
		message: 'isShowing',
	};

	const RESTORE_DEFAULTS = {
		message: 'restoreDefaults',
	};

	const HIGHLIGHT = {
		message: 'highlight',
	};

	const STORAGE_EXCEEDED = {
		message: 'storageExceeded',
	};

	const PHOTO_SOURCE_FAILED = {
		message: 'photosFailed',
		type: '',
		error: '',
	};


	return {

		SCREENSAVER_SHOW: SCREENSAVER_SHOW,
		SCREENSAVER_CLOSE: SCREENSAVER_CLOSE,
		SCREENSAVER_IS_SHOWING: SCREENSAVER_IS_SHOWING,
		RESTORE_DEFAULTS: RESTORE_DEFAULTS,
		HIGHLIGHT: HIGHLIGHT,
		STORAGE_EXCEEDED: STORAGE_EXCEEDED,
		PHOTO_SOURCE_FAILED: PHOTO_SOURCE_FAILED,

		/**
		 * Send a chrome message
		 * @param {Object} type - type of message
		 * @returns {Promise<JSON>} response JSON
		 * @memberOf app.Msg
		 */
		send: function(type) {
			return chromep.runtime.sendMessage(type, null).then((response) => {
				return Promise.resolve(response);
			}).catch((err) => {
				if (err.message && !err.message.includes('port closed')) {
					console.error(err);
				}
				return Promise.reject(err);
			});
		},
	};
})();
