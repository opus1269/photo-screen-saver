/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Interface to 500px API
 * @namespace
 */
app.Use500px = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * 500px rest API
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Use500px
	 */
	const _URL_BASE = 'https://api.500px.com/v1/';

	/**
	 * API authorization key
	 * @type {string}
	 * @const
	 * @private
	 * @memberOf app.Use500px
	 */
	const _KEY = 'iyKV6i6wu0R8QUea9mIXvEsQxIF0tMRVXopwYcFC';

	/**
	 * Max photos to return - 100 is API max
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Use500px
	 */
	const _MAX_PHOTOS = 90;

	/**
	 * Categories to use Make them an array to overcome 100 photo limit per call
	 * @type {Array}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Use500px
	 */
	const _CATS = [
		'Nature,City and Architecture',
		'Landscapes,Animals',
		'Macro,Still Life,Underwater',
	];

	/**
	 * Call API to get some photos
	 * @param {string} url - server url
	 * @returns {Promise<app.PhotoSource.Photo[]>} Array photos
	 * @private
	 * @memberOf app.Use500px
	 */
	function _doGet(url) {
		return app.Http.doGet(url).then((response) => {
			if (response.error) {
				throw new Error(response.error);
			}
			const photos = [];
			response.photos.forEach((photo) => {
				if (!photo.nsfw) {
					const asp = photo.width / photo.height;
					let ex = null;
					let pt = null;
					if (photo.latitude && photo.longitude) {
						pt = app.PhotoSource
							.getPt(photo.latitude, photo.longitude);
						ex = {};
					}
					app.PhotoSource.addImage(photos, photo.images[0].url,
						photo.user.fullname, asp, ex, pt);
				}
			});
			return Promise.resolve(photos);
		});
	}

	return {
		/**
		 * Retrieve the array of 500px photos
		 * @param {string} type - name of 500px gallery
		 * @returns {Promise<app.PhotoSource.Photo[]>} Array of photos
		 * @memberOf app.Use500px
		 */
		loadImages: function(type) {
			// series of API calls
			const promises = [];
			_CATS.forEach((_CAT) => {
				let url =
					`${_URL_BASE}photos/?consumer_key=${_KEY}&feature=${type}` +
					`&only=${_CAT}&rpp=${_MAX_PHOTOS}` +
					'&sort=rating&image_size=2048';
				promises.push(_doGet(url));
			});

			// Collate the photos
			return Promise.all(promises).then((values) => {
				let photos = [];
				values.forEach((value) => {
					photos = photos.concat(value);
				});
				return Promise.resolve(photos);
			});
		},
	};
})();
