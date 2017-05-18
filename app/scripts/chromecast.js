/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.ChromeCast = (function() {
	'use strict';

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

	/**
	 * Interface to the Chromecast photos
	 * @namespace app.ChromeCast
	 */

	return {
		/**
		 * Get the photos from chromecast.json
		 * @returns {Promise<app.PhotoSource.Photo[]>} Array of photos
		 * @memberOf app.ChromeCast
		 */
		loadImages: function() {
			const url = '/assets/chromecast.json';
			return app.Http.doGet(url).then((photos) => {
				photos.forEach((photo) => {
					photo.asp = 16 / 9;
				});
				return Promise.resolve(photos);
			});
		},
	};
})();
