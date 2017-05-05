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
app.Utils = (function() {
	'use strict';

	/**
	 * Utility methods
	 * @namespace Utils
	 */

	return {

		/**
		 * Get the Chrome version
		 * @see http://stackoverflow.com/a/4900484/4468645
		 * @return {Integer} Chrome major version
		 * @memberOf Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the i18n string
		 * @param {String} messageName - key in message.json
		 * @return {String} internationalized string
		 * @memberOf Utils
		 */
		localize: function(messageName) {
			return chrome.i18n.getMessage(messageName);
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {String} str str to check
		 * @return {Boolean} true is str is whitespace (or null)
		 * @memberOf Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get integer value from localStorage
		 * @param {String} key key to get value for
		 * @return {Integer} value as integer
		 * @memberOf Utils
		 */
		getInt: function(key) {
			return parseInt(localStorage.getItem(key), 10);
		},

		/**
		 * Get boolean value from localStorage
		 * @param {String} key key to get value for
		 * @return {Boolean} value as boolean
		 * @memberOf Utils
		 */
		getBool: function(key) {
			return JSON.parse(localStorage.getItem(key));
		},

		/**
		 * Get JSON value from localStorage
		 * @param {String} key key to get value for
		 * @return {JSON} value as JSON Object
		 * @memberOf Utils
		 */
		getJSON: function(key) {
			return JSON.parse(localStorage.getItem(key));
		},

		/**
		 * Save a value to localStorage only if there is enough room
		 * @param {String} key localStorage Key
		 * @param {String} value JSON stringified value to save
		 * @param {String} keyBool optional key to a boolean value
		 *                 that is true if the primary key has non-empty value
		 * @return {Boolean} true if value was set successfully
		 * @memberOf Utils
		 */
		safeSet: function(key, value, keyBool) {
			let ret = true;
			const oldValue = app.Utils.getJSON(key);
			try {
				localStorage.setItem(key, value);
			} catch (e) {
				ret = false;
				if (oldValue) {
					// revert to old value
					localStorage.setItem(key, JSON.stringify(oldValue));
				}
				if (keyBool) {
					// revert to old value
					if (oldValue && oldValue.length) {
						localStorage.setItem(keyBool, 'true');
					} else {
						localStorage.setItem(keyBool, 'false');
					}
				}
				// notify listeners
				chrome.runtime.sendMessage({
					message: 'storageExceeded',
					name: keyBool,
				}, function(response) {});
			}

			return ret;
		},

		/**
		 * Get the idle time in seconds
		 * @return {Integer} idle time in seconds
		 * @memberOf Utils
		 */
		getIdleSeconds: function() {
			const idle = app.Utils.getJSON('idleTime');
			return idle.base * 60;
		},

		/**
		 * true if we are MS windows
		 * @return {boolean} true if MS windows
		 * @memberOf Utils
		 */
		isWin: function() {
			return localStorage.getItem('os') === 'win';
		},

		/**
		 * Returns a random integer between min and max inclusive
		 * @param {Integer} min
		 * @param {Integer} max
		 * @return {Integer} random int
		 * @memberOf Utils
		 */
		getRandomInt: function(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		},

		/**
		 * Randomly sort an Array in place
		 * Fisher-Yates shuffle algorithm.
		 * @param {Array} array array to sort
		 * @memberOf Utils
		 */
		shuffleArray: function(array) {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},

		/**
		 * Add an image object to an existing Array
		 * @param {Array} images Array of image objects
		 * @param {String} url The url to the photo
		 * @param {String} author The photographer
		 * @param {Number} asp The aspect ratio of the photo
		 * @param {Object} ex Optional, additional information about the photo
		 * @memberOf Utils
		 */
		addImage: function(images, url, author, asp, ex) {
			const image = {url: url, author: author, asp: asp.toPrecision(3)};
			if (ex) {
				image.ex = ex;
			}
			images.push(image);
		},
	};
})();
