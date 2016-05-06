/*
@@license
*/
/*exported myUtils*/
var myUtils = (function() {
	'use strict';

	return {

		/**
		 * Get the Chrome version
		 *
		 * @return {Integer} Chrome major version
		 */
		getChromeVersion: function() {
			// http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
			var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Determine if a String is null or whitespace only
		 *
		 * @param {String} str str to check
		 * @return {Boolean} true is str is whitespace (or null)
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Randomly sort an Array in place
		 *
		 * @param {Array} array array to sort
		 */
		shuffleArray: function(array) {
			// Fisher-Yates shuffle algorithm.
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},

		/**
		 * Get a globally unique identifier
		 *
		 * @return {String} a GUID
		 */
		getGuid: function() {
			// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1);
			}
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
				s4() + '-' + s4() + s4() + s4();
		},

		/**
		 * Add an image object to an existing Array
		 *
		 * @param {Array} images Array of image objects
		 * @param {String} url The url to the photo
		 * @param {String} author The photographer
		 * @param {Double} asp The aspect ratio of the photo
		 * @param {Object} ex Optional, additional information about the photo
		 */
		addImage: function(images, url, author, asp, ex) {
			var image = {url: url, author: author, asp: asp.toPrecision(3)};
			if (ex) {
				image.ex = ex;
			}
			images.push(image);
		}

	};
})();
