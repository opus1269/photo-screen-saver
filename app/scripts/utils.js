/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Utility methods
 * @namespace
 */
app.Utils = (function() {
	'use strict';

	new ExceptionHandler();

	return {
		/** Get the extension's name
		 * @returns {string} Extension name
		 * @memberOf app.Utils
		 */
		getExtensionName: function() {
			return `chrome-extension://${chrome.runtime.id}`;
		},

		/**
		 * Get the Extension version
		 * @returns {string} Extension version
		 * @memberOf app.Utils
		 */
		getVersion: function() {
			const manifest = chrome.runtime.getManifest();
			return manifest.version;
		},

		/**
		 * Get the Chrome version
		 * @see http://stackoverflow.com/a/4900484/4468645
		 * @returns {int} Chrome major version
		 * @memberOf app.Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the full Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @returns {string} Chrome version
		 * @memberOf app.Utils
		 */
		getFullChromeVersion: function() {
			const raw = navigator.userAgent;
			return raw ? raw : 'Unknown';
		},

		/**
		 * Get the i18n string
		 * @param {string} messageName - key in messages.json
		 * @returns {string} internationalized string
		 * @memberOf app.Utils
		 */
		localize: function(messageName) {
			return chrome.i18n.getMessage(messageName);
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {?string} str - string to check
		 * @returns {boolean} true is str is whitespace (or null)
		 * @memberOf app.Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get the idle time in seconds
		 * @returns {int} idle time in seconds
		 * @memberOf app.Utils
		 */
		getIdleSeconds: function() {
			const idle = app.Storage.get('idleTime');
			return idle.base * 60;
		},

		/**
		 * true if we are MS windows
		 * @returns {boolean} true if MS windows
		 * @memberOf app.Utils
		 */
		isWin: function() {
			return app.Storage.get('os') === 'win';
		},

		/**
		 * Returns a random integer between min and max inclusive
		 * @param {int} min - min value
		 * @param {int} max - max value
		 * @returns {int} random int
		 * @memberOf app.Utils
		 */
		getRandomInt: function(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		},

		/**
		 * Randomly sort an Array in place
		 * Fisher-Yates shuffle algorithm.
		 * @param {Array} array - Array to sort
		 * @memberOf app.Utils
		 */
		shuffleArray: function(array) {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},
	};
})();
