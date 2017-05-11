/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.Reddit = (function() {
	'use strict';

	/**
	 * Interface to Reddit API
	 * @namespace Reddit
	 */

	/**
	 * Extensions redirect uri
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const REDIRECT_URI =
		'https://kohpcmlfdjfdggcjmjhhbcbankgmppgc.chromiumapp.org/reddit';

	/**
	 * Reddit rest API authorization key
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const KEY = 'bATkDOUNW_tOlg';

	/**
	 * Max photos to return
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const MAX_PHOTOS = 100;
	/**
	 * Min size of photo to use
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const MIN_SIZE = 750;

	/**
	 * Max size of photo to use
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const MAX_SIZE = 3500;

	/**
	 * Expose reddit API
	 * @type {function}
	 * @const
	 * @default
	 * @private
	 * @memberOf Reddit
	 */
	const snoocore = new Snoocore({
		userAgent: 'photo-screen-saver',
		throttle: 0,
		oauth: {
			type: 'implicit',
			key: KEY,
			redirectUri: REDIRECT_URI,
			scope: ['read'],
		},
	});

	/**
	 * Parse the size from the submission title.
	 * this is the old way reddit did it
	 * @param {string} title - submission title
	 * @return {{width: number, height: number}} Photo size
	 * @private
	 * @memberOf Reddit
	 */
	function _getSize(title) {
		let ret = {width: -1, height: -1};
		let res;
		const regex = /\[(\d*)\D*(\d*)\]/;

		res = title.match(regex);
		if (res) {
			ret.width = parseInt(res[1], 10);
			ret.height = parseInt(res[2], 10);
		}
		return ret;
	}

	/**
	 * Build the list of photos for one page of items
	 * @param {Array} children Array of photos returned from reddit
	 * @return {Array} Array of images in our format,
	 * stripped of NSFW and big and small photos
	 * @private
	 * @memberOf Reddit
	 */
	const _processChildren = function(children) {
		let data;
		let item;
		const images = [];
		let url;
		let width = 1;
		let height = 1;
		let asp;

		for (let j = 0; j < children.length; j++) {
			data = children[j].data;
			if (data.over_18) {
				// skip NSFW
				continue;
			} else if (data.preview && data.preview.images) {
				// new way. has full size image and array of reduced resolutions
				item = data.preview.images[0];
				url = item.source.url;
				width = parseInt(item.source.width, 10);
				height = parseInt(item.source.height, 10);
				if (Math.max(width, height) > MAX_SIZE) {
					// too big. get the largest reduced resolution image
					item = item.resolutions[item.resolutions.length - 1];
					url = item.url.replace(/&amp;/g, '&');
					width = parseInt(item.width, 10);
					height = parseInt(item.height, 10);
				}
			} else if (data.title) {
				// old way of specifying images
				const size = _getSize(data.title);
				url = data.url;
				width = size.width;
				height = size.height;
			}

			asp = width / height;
			if (asp && !isNaN(asp) && (Math.max(width, height) >= MIN_SIZE) &&
				(Math.max(width, height) <= MAX_SIZE)) {
				app.Utils.addImage(images, url, data.author, asp, data.url);
			}
		}
		return images;
	};

	return {

		/**
		 * Retrieve the array of reddit photos
		 * @param {string} subreddit name of photo subreddit
		 * @param {function} callback (error, photos) Array of photos on success
		 * @memberOf Reddit
		 */
		loadImages: function(subreddit, callback) {
			// callback(error, photos)
			callback = callback || function() {};
			
			let photos = [];

			snoocore(subreddit + 'hot').listing({
				limit: MAX_PHOTOS,
			}).then(function(slice) {
				photos = photos.concat(_processChildren(slice.children));
				return slice.next();
			}).then(function(slice) {
				photos = photos.concat(_processChildren(slice.children));
				callback(null, photos);
			}).catch(function(reason) {
				callback(reason);
			});
		},
	};
})();
