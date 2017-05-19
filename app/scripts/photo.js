/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	'use strict';

	/**
	 * A photo for the screen saver
	 * Important: Only implement static methods. This Object
	 * will be shallow copied in the screensaver and lose its instance methods
	 * @param {string} name - unique name
	 * @param {Object} source - source item
	 * @constructor
	 * @alias Photo
	 */
	const Photo = function(name, source) {
		this.name = name;
		this.path = source.url;
		this.author = source.author ? source.author : '';
		this.type = source.type;
		this.aspectRatio = source.asp;
		this.ex = source.ex;
        this.point = source.point;
		this.width = screen.width;
		this.height = screen.height;
		this.label = Photo.buildAuthorLabel(this.type, this.author, false);
		this.location = null;
	};

	/**
	 * Create the author label
	 * @param {string} type - source of photo
	 * @param {string} author - author of photo
	 * @param {boolean} force - require display of label if true
	 * @returns {string} label describing the photo source and photographer name
	 */
	Photo.buildAuthorLabel = function(type, author, force) {
		let ret = '';
		let newType = type;
		const idx = type.search('User');

		if (!force && !app.Storage.getBool('showPhotog') && (idx !== -1)) {
			// don't show label for user's own photos, if requested
			return ret;
		}

		if (idx !== -1) {
			// strip off 'User'
			newType = type.substring(0, idx - 1);
		}

		if (author) {
			ret = `${author} / ${newType}`;
		} else {
			// no photographer name
			ret = `Photo from ${newType}`;
		}
		return ret;
	};

	/**
	 * Determine if a photo would look bad zoomed or stretched on the screen
	 * @param {number} asp aspect ratio of photo
	 * @param {number} screenAsp - the screen aspect ratio
	 * @returns {boolean} true if a photo aspect ratio differs substantially
	 * from the screens'
	 * @private
	 */
	Photo._isBadAspect = function(asp, screenAsp) {
		// arbitrary
		const CUT_OFF = 0.5;
		return (asp < screenAsp - CUT_OFF) || (asp > screenAsp + CUT_OFF);
	};

	/**
	 * Determine if a photo should not be displayed
	 * @param {number} asp - aspect ratio
	 * @param {number} screenAsp - the screen aspect ratio
	 * @param {int} photoSizing - the sizing type
	 * @returns {boolean} true if the photo should not be displayed
	 */
	Photo.ignore = function(asp, screenAsp, photoSizing) {
		let ret = false;
		const skip = app.Storage.getBool('skip');

		if ((!asp || isNaN(asp)) ||
			(skip && ((photoSizing === 1) || (photoSizing === 3)) &&
			Photo._isBadAspect(asp, screenAsp))) {
			// ignore photos that don't have aspect ratio
			// or would look bad with cropped or stretched sizing options
			ret = true;
		}
		return ret;
	};

	/**
	 * Create a new tab with a link to the
	 * original source of the current photo, if possible
	 * @param {Object} item - a photo item
	 */
	Photo.showSource = function(item) {
		if (!item) {
			return;
		}
		const path = item.path;
		const extra = item.ex;
		let regex;
		let id;
		let url;

		switch (item.type) {
			case '500':
				// parse photo id
				regex = /(\/[^\/]*){4}/;
				id = path.match(regex);
				url = `http://500px.com/photo${id[1]}`;
				chrome.tabs.create({url: url});
				break;
			case 'flickr':
				if (extra) {
					// parse photo id
					regex = /(\/[^\/]*){4}(_.*_)/;
					id = path.match(regex);
					url = `https://www.flickr.com/photos/${item.ex}${id[1]}`;
					chrome.tabs.create({url: url});
				}
				break;
			case 'reddit':
				if (extra) {
					chrome.tabs.create({url: item.ex});
				}
				break;
			default:
				break;
		}
	};

	window.app = window.app || {};
	app.Photo = Photo;
})(window);
