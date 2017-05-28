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

	new ExceptionHandler();

	/**
	 * A Chrome message
	 * @typedef {{}} app.Msg.Message
	 * @property {string} message - Unique name
	 * @property {Error} error - an error
	 * @property {string} key - key name
	 * @property {?Object} value - value of key
	 * @memberOf app.Msg
	 */

	/**
	 * Show {@link app.ScreenSaver}
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const SS_SHOW = {
		message: 'showScreensaver',
	};

	/**
	 * Close {@link app.ScreenSaver}
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const SS_CLOSE = {
		message: 'closeScreensaver',
	};

	/**
	 * Is a {@link app.ScreenSaver} showing
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const SS_IS_SHOWING = {
		message: 'isScreensaverShowing',
	};

	/**
	 * Restore default settings
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const RESTORE_DEFAULTS = {
		message: 'restoreDefaults',
	};

	/**
	 * Highlight a tab
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const HIGHLIGHT = {
		message: 'highlightTab',
	};

	/**
	 * A save attempt to localStorage exceeded its capacity
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const STORAGE_EXCEEDED = {
		message: 'storageExceeded',
	};

	/**
	 * An {@link app.PhotoSource} server request failed
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const PHOTO_SOURCE_FAILED = {
		message: 'photoSourceFailed',
		key: '',
		error: '',
	};

	/**
	 * Save value to storage message
	 * @type {app.Msg.Message}
	 * @memberOf app.Msg
	 */
	const STORE = {
		message: 'store',
		key: '',
		value: '',
	};

	return {

		SS_SHOW: SS_SHOW,
		SS_CLOSE: SS_CLOSE,
		SS_IS_SHOWING: SS_IS_SHOWING,
		RESTORE_DEFAULTS: RESTORE_DEFAULTS,
		HIGHLIGHT: HIGHLIGHT,
		STORAGE_EXCEEDED: STORAGE_EXCEEDED,
		PHOTO_SOURCE_FAILED: PHOTO_SOURCE_FAILED,
		STORE: STORE,

		/**
		 * Send a chrome message
		 * @param {app.Msg.Message} type - type of message
		 * @returns {Promise<JSON>} response JSON
		 * @memberOf app.Msg
		 */
		send: function(type) {
			const chromep = new ChromePromise();
			return chromep.runtime.sendMessage(type, null).then((response) => {
				return Promise.resolve(response);
			}).catch((err) => {
				if (err.message &&
					!err.message.includes('port closed') &&
					!err.message.includes('Receiving end does not exist')) {
					const msg = `type: ${type.message}, ${err.message}`;
					app.GA.error(msg, 'Msg.send');
				}
				return Promise.reject(err);
			});
		},

		/**
		 * Add a listener for chrome messages
		 * @param {Function} listener - function to receive messages
		 * @memberOf app.Msg
		 */
		listen: function(listener) {
			chrome.runtime.onMessage.addListener(listener);
		},
	};
})();
