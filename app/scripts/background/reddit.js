/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Interface to Reddit API
 * @namespace
 */
app.Reddit = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Extension's redirect uri
	 * @type {string}
	 * @const
	 * @private
	 * @memberOf app.Reddit
	 */
	const _REDIRECT_URI =
		`https://${chrome.runtime.id}.chromiumapp.org/reddit`;

	/**
	 * Reddit rest API authorization key
	 * @type {string}
	 * @const
	 * @private
	 * @memberOf app.Reddit
	 */
	const _KEY = 'bATkDOUNW_tOlg';

	/**
	 * Max photos to return
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Reddit
	 */
	const _MAX_PHOTOS = 100;

	/**
	 * Min size of photo to use
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Reddit
	 */
	const _MIN_SIZE = 750;

	/**
	 * Max size of photo to use
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Reddit
	 */
	const _MAX_SIZE = 3500;

	/**
	 * Expose reddit API
	 * @type {Function}
	 * @const
	 * @private
	 * @memberOf app.Reddit
	 */
	const _snoocore = new Snoocore({
		userAgent: 'photo-screen-saver',
		throttle: 0,
		oauth: {
			type: 'implicit',
			key: _KEY,
			redirectUri: _REDIRECT_URI,
			scope: ['read'],
		},
	});

	/**
	 * Parse the size from the submission title.
	 * this is the old way reddit did it
	 * @param {string} title - submission title
	 * @returns {{width: int, height: int}} Photo size
	 * @private
	 * @memberOf app.Reddit
	 */
	function _getSize(title) {
		const ret = {width: -1, height: -1};
		const regex = /\[(\d*)\D*(\d*)\]/;
		const res = title.match(regex);
		if (res) {
			ret.width = parseInt(res[1], 10);
			ret.height = parseInt(res[2], 10);
		}
		return ret;
	}

	/**
	 * Build the list of photos for one page of items
	 * @param {Array} children - Array of objects from reddit
	 * @returns {app.PhotoSource.SourcePhoto[]} Array of photos
	 * @private
	 * @memberOf app.Reddit
	 */
	function _processChildren(children) {
		const photos = [];
		let url;
		let width = 1;
		let height = 1;

		children.forEach((child) => {
			const data = child.data;
			if (!data.over_18) {
				// skip NSFW
				if (data.preview && data.preview.images) {
					// new way. has full size image and array of reduced
					// resolutions
					let item = data.preview.images[0];
					url = item.source.url;
					width = parseInt(item.source.width, 10);
					height = parseInt(item.source.height, 10);
					if (Math.max(width, height) > _MAX_SIZE) {
						// too big. get the largest reduced resolution image
						item = item.resolutions[item.resolutions.length - 1];
						url = item.url.replace(/&amp;/g, '&');
						width = parseInt(item.width, 10);
						height = parseInt(item.height, 10);
					}
				} else if (data.title) {
					// old way of specifying images - parse size from title
					const size = _getSize(data.title);
					url = data.url;
					width = size.width;
					height = size.height;
				}
			}

			const asp = width / height;
			const author = data.author;
			if (asp && !isNaN(asp) && (Math.max(width, height) >= _MIN_SIZE) &&
				(Math.max(width, height) <= _MAX_SIZE)) {
				app.PhotoSource.addPhoto(photos, url, author, asp, data.url);
			}
		});
		return photos;
	}

	return {
		/**
		 * Retrieve the array of reddit photos
		 * @param {string} subreddit - name of photo subreddit
		 * @returns {Promise<app.PhotoSource.SourcePhoto[]>} Array of photos
		 * @memberOf app.Reddit
		 */
		loadPhotos: function(subreddit) {
			let photos = [];

			return _snoocore(`${subreddit}hot`).listing({
				limit: _MAX_PHOTOS,
			}).then((slice) => {
				photos = photos.concat(_processChildren(slice.children));
				return slice.next();
			}).then((slice) => {
				photos = photos.concat(_processChildren(slice.children));
				return Promise.resolve(photos);
			}).catch((err) => {
				let msg = err.message;
				if (msg) {
					// extract first sentence
					const idx = msg.indexOf('.');
					if (idx !== -1) {
						msg = msg.substring(0, idx + 1);
					}
				} else {
					msg = 'Unknown Error';
				}
				throw new Error(msg);
			});
		},
	};
})();
