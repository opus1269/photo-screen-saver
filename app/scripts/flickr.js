/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Interface to flickr API
 * @namespace
 */
app.Flickr = (function() {
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
	 * Flickr rest API
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Flickr
	 */
	const _URL_BASE = 'https://api.flickr.com/services/rest/';

	/**
	 * Flickr rest API authorization key
	 * @type {string}
	 * @const
	 * @private
	 * @memberOf app.Flickr
	 */
	const _KEY = '1edd9926740f0e0d01d4ecd42de60ac6';

	/**
	 * Max photos to return
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Flickr
	 */
	const _MAX_PHOTOS = 300;

	return {
		/**
		 * Retrieve flickr photos
		 * @returns {Promise<app.PhotoSource.Photo[]>} Array of photos
		 * @memberOf app.Flickr
		 */
		loadImages: function() {
			const url =
				`${_URL_BASE}?method=flickr.interestingness.getList` +
				`&api_key=${_KEY}&extras=owner_name,url_k,media` +
				`&per_page=${_MAX_PHOTOS}&format=json&nojsoncallback=1`;

			return app.Http.doGet(url).then((response) => {
				if (response.stat !== 'ok') {
					throw new Error(response.message);
				}
				const photos = [];
				response.photos.photo.forEach((photo) => {
					if (photo && photo.url_k &&
						(photo.media === 'photo') &&
						(photo.isfriend !== '0') &&
						(photo.isfamily !== '0')) {
						const width = parseInt(photo.width_k, 10);
						const height = parseInt(photo.height_k, 10);
						const asp = width / height;
						app.PhotoSource.addImage(photos, photo.url_k,
							photo.ownername, asp, photo.owner);
					}
				});
				return Promise.resolve(photos);
			});
		},
	};
})();
