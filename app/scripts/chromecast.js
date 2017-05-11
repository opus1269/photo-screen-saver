/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.ChromeCast = (function() {
	'use strict';

	/**
	 * Interface to the chromecast photos
	 * @namespace ChromeCast
	 */

	return {

		/**
		 * Get the photos from chromecast.json
		 * @param {function} callback (error, photos)
		 * @memberOf ChromeCast
		 */
		loadImages: function(callback) {
			callback = callback || function() {};
			let photos = [];
			const xhr = new XMLHttpRequest();

			xhr.onload = function() {
				if (xhr.status === 200) {
					photos = JSON.parse(xhr.responseText);
					for (let i = 0; i < photos.length; i++) {
						photos[i].asp = 16 / 9;
					}
					callback(null, photos);
				} else {
					callback(xhr.responseText);
				}
			};

			xhr.onerror = function(error) {
				callback(error);
			};

			xhr.open('GET', '/assets/chromecast.json', true);
			xhr.send();
		},
	};
})();
