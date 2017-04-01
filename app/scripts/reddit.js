/*
@@license
*/
/*exported reddit*/
var reddit = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var KEY = 'bATkDOUNW_tOlg';
	var MAX_PHOTOS = 100;
	var MIN_SIZE = 750;
	var MAX_SIZE = 3500;

	// Expose reddit
	var snoocore = new Snoocore({
		userAgent: 'photo-screen-saver',
		throttle: 0,
		oauth: {
			type: 'implicit',
			key: KEY,
			redirectUri: 'https://kohpcmlfdjfdggcjmjhhbcbankgmppgc.chromiumapp.org/reddit',
			scope: ['read']
		}
	});

	// parse the size from the submission title
	// this is the old way reddit did it
	var getSize  = function(title) {
		var ret = {width: -1, height: -1};
		var res;
		var regex = /\[(\d*)\D*(\d*)\]/;

		res = title.match(regex);
		if (res) {
			ret.width = parseInt(res[1], 10);
			ret.height = parseInt(res[2], 10);
		}
		return ret;
	};

	/**
	 * Build the list of photos for one page of items
	 *
	 * @param {Array} children Array of photos returned from reddit
	 * @return {Array} Array of images in our format, stripped of NSFW and big and small photos
	 *
	 */
	var processChildren = function(children) {
		var data;
		var item;
		var images = [];
		var url;
		var width = 1;
		var height = 1;
		var asp;

		for (var j = 0; j < children.length; j++) {
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
				var size = getSize(data.title);
				url = data.url;
				width = size.width;
				height = size.height;
			}

			asp = width / height;
			if (asp && !isNaN(asp) && Math.max(width, height) >= MIN_SIZE && Math.max(width, height) <= MAX_SIZE) {
				myUtils.addImage(images, url, data.author, asp, data.url);
			}
		}
		return images;
	};

	return {

		/**
		 * Retrieve the array of reddit photos
		 *
		 * @param {string} subreddit name of photo subreddit
		 * @param {function} callback error, photos) Array of photos on success
		 *
		 */
		loadImages: function(subreddit, callback) {
			// callback(error, photos)
			callback = callback || function() {};
			
			var photos = [];

			snoocore(subreddit + 'hot').listing({
				limit: MAX_PHOTOS
			}).then(function(slice) {
				photos = photos.concat(processChildren(slice.children));
				return slice.next();
			}).then(function(slice) {
				photos = photos.concat(processChildren(slice.children));
				callback(null, photos);
			}).catch(function(reason) {
				callback(reason);
			});
		}
	};
})();
