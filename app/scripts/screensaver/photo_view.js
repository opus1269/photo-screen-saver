/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Handle rendering of a photo in screen saver
 * @namespace
 */
app.PhotoView = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Important components of a photo view
	 * @typedef {Object} app.PhotoView.Elements
	 * @property {Element} image - paper-image
	 * @property {Element} author - label
	 * @property {Element} time - label
	 * @property {Element} location - Geo location
	 * @property {Object} model - template model
	 * @property {app.Photo} item - photo item
	 * @memberOf app.PhotoView
	 */

	/**
	 * Aspect ratio of screen
	 * @type {number}
	 * @const
	 * @private
	 * @memberOf app.PhotoView
	 */
	const _SCREEN_ASPECT = screen.width / screen.height;

	/**
	 * Does a photo have an author label to show
	 * @param {int} idx - index into animated pages
	 * @returns {boolean} true if we should show the author
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _hasAuthor(idx) {
		const e = _getElements(idx);
		return !!(e && e.item && e.item.label);
	}

	/**
	 * Does a photo have a geolocation
	 * @param {int} idx - index into animated pages
	 * @returns {boolean} true if geolocation point is non-null
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _hasLocation(idx) {
		const e = _getElements(idx);
		return !!(e && e.item && e.item.point);
	}

	/**
	 * Should we show the location, if available
	 * @returns {boolean} true if we should show the location
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _showLocation() {
		return app.Storage.getBool('showLocation');
	}

	/**
	 * Get references to the important elements of a slide
	 * @param {int} idx - index into animated pages
	 * @returns {app.PhotoView.Elements} important elements of a slide
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _getElements(idx) {
		const rep = document.querySelector('#repeatTemplate');
		const pages = document.querySelector('#pages');
		const el = pages.querySelector('#item' + idx);
		const ret = {};
		ret.image = el.querySelector('.image');
		ret.author = el.querySelector('.author');
		ret.location = el.querySelector('.location');
		ret.time = el.querySelector('.time');
		ret.model = rep.modelForElement(ret.image);
		ret.item = ret.model.get('item');
		return ret;
	}

	/**
	 * Finalize DOM for a letter boxed photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _letterbox(idx) {
		const e = _getElements(idx);
		const aspect = e.item.aspectRatio;

		e.author.style.textAlign = 'right';
		e.location.style.textAlign = 'left';
		// percent of the screen width of image
		let imgWidthPer = ((aspect / _SCREEN_ASPECT * 100));
		imgWidthPer = Math.min(imgWidthPer, 100.0);
		let right = (100 - imgWidthPer) / 2;
		// percent of the screen height of image
		let imgHeightPer = ((_SCREEN_ASPECT / aspect * 100));
		imgHeightPer = Math.min(imgHeightPer, 100.0);
		let bottom = (100 - imgHeightPer) / 2;
		e.author.style.right = (right + 1) + 'vw';
		e.author.style.bottom = (bottom + 1) + 'vh';
		e.author.style.width = imgWidthPer - .5 + 'vw';
		e.location.style.left = (right + 1) + 'vw';
		e.location.style.bottom = (bottom + 1) + 'vh';
		e.location.style.width = imgWidthPer - .5 + 'vw';
		e.time.style.right = (right + 1) + 'vw';
		e.time.style.bottom = (bottom + 3.5) + 'vh';

		if (app.Storage.getBool('showTime')) {
			// don't wrap author
			e.author.style.textOverflow = 'ellipsis';
			e.author.style.whiteSpace = 'nowrap';
		}

		// percent of half the width of image
		let maxWidth = imgWidthPer / 2;
		if (_showLocation() && _hasLocation(idx)) {
			// limit author width if we also have a location
			e.author.style.maxWidth = maxWidth - 1.1 + 'vw';
		}

		if (_hasAuthor(idx)) {
			// limit location width if we also have an author
			e.location.style.maxWidth = maxWidth - 1.1 + 'vw';
		}
	}

	/**
	 * Finalize DOM for a stretched photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _stretch(idx) {
		const e = _getElements(idx);
		const img = e.image.$.img;
		img.style.width = '100%';
		img.style.height = '100%';
		img.style.objectFit = 'fill';
	}

	/**
	 * Set style info for labels in frame mode
	 * @param {Element} el - element to style
	 * @param {int} width - frame width
	 * @param {int} height - frame height
	 * @param {boolean} isLeft - if true align left, else right
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _setFrameLabelStyle(el, width, height, isLeft) {
		el.style.textOverflow = 'ellipsis';
		el.style.whiteSpace = 'nowrap';
		el.style.color = 'black';
		el.style.opacity = 1.0;
		el.style.fontSize = '2.5vh';
		el.style.fontWeight = 400;

		// percent of screen width for label padding
		let padPer = 0.5;
		// percent of screen width of image
		let imgWidthPer = (width / screen.width) * 100;
		// percent of screen width on each side of image
		let sidePer = (100 - imgWidthPer) / 2;
		if (isLeft) {
			el.style.left = sidePer + padPer + 'vw';
			el.style.right = '';
			el.style.textAlign = 'left';
		} else {
			el.style.right = sidePer + padPer + 'vw';
			el.style.left = '';
			el.style.textAlign = 'right';
		}
		el.style.width = imgWidthPer - 2 * padPer + 'vw';

		// percent of screen height of image
		let imgHtPer = (height / screen.height) * 100;
		// percent of screen height on each side of image
		let topPer = (100 - imgHtPer) / 2;
		el.style.bottom = topPer + 1.1 + 'vh';
	}

	/**
	 * Finalize DOM for a framed photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _frame(idx) {
		const e = _getElements(idx);
		const model = e.model;
		const author = e.author;
		const location = e.location;
		const time = e.time;
		const image = e.image;
		const img = image.$.img;
		/** @type {Photo} */
		const photo = e.item;
		const aspect = photo.aspectRatio;

		// scale to screen size
		const border = screen.height * 0.005;
		const borderBot = screen.height * 0.05;
		const padding = screen.height * 0.025;

		const label =
			app.Photo.buildAuthorLabel(photo.type, photo.author, true);
		model.set('item.label', label);

		const height =
			Math.min((screen.width - padding * 2 - border * 2) / aspect,
				screen.height - padding * 2 - border - borderBot);
		const width = height * aspect;

		// size with the frame
		const frWidth = width + border * 2;
		const frHeight = height + borderBot + border;

		img.style.height = height + 'px';
		img.style.width = width + 'px';

		image.height = height;
		image.width = width;
		image.style.top = (screen.height - frHeight) / 2 + 'px';
		image.style.left = (screen.width - frWidth) / 2 + 'px';
		image.style.border = 0.5 + 'vh ridge WhiteSmoke';
		image.style.borderBottom = 5 + 'vh solid WhiteSmoke';
		image.style.borderRadius = '1.5vh';
		image.style.boxShadow = '1.5vh 1.5vh 1.5vh rgba(0,0,0,.7)';

		_setFrameLabelStyle(author, frWidth, frHeight, false);
		_setFrameLabelStyle(location, frWidth, frHeight, true);

		// percent of screen height of image
		let imgHtPer = (frHeight / screen.height) * 100;
		// percent of screen height on each side of image
		let topPer = (100 - imgHtPer) / 2;
		// percent of screen width of image
		let imgWidthPer = (frWidth / screen.width) * 100;
		// percent of screen width on each side of image
		let sidePer = (100 - imgWidthPer) / 2;
		time.style.right = sidePer + 1.0 + 'vw';
		time.style.textAlign = 'right';
		time.style.bottom = topPer + 5.0 + 'vh';

		// percent of half the width of image
		let maxWidth = imgWidthPer / 2;
		if (_showLocation() && _hasLocation(idx)) {
			// limit author width if we also have a location
			e.author.style.maxWidth = maxWidth - 1 + 'vw';
		}

		if (_hasAuthor(idx)) {
			// limit location width if we also have an author
			e.location.style.maxWidth = maxWidth - 1 + 'vw';
		}
	}

	/**
	 * Add superscript to the label for 500px photos
	 * @param {int} idx - index into animated pages
	 * @memberOf app.PhotoView
	 * @private
	 */
	function _super500px(idx) {
		const e = _getElements(idx);
		const type = e.item.type;
		const authorText = e.item.label;
		const sup = e.author.querySelector('#sup');
		sup.textContent = '';
		if (!app.Utils.isWhiteSpace(authorText) && (type === '500')) {
			sup.textContent = 'px';
		}
	}

	return {
		/**
		 * Get the name of the photo in this view
		 * @param {int} idx - index into animated pages
		 * @returns {string} name of photo
		 * @memberOf app.PhotoView
		 */
		getName: function(idx) {
			const e = _getElements(idx);
			return e.item.name;
		},

		/**
		 * Finalize DOM for a photo
		 * @param {int} idx - index into animated pages
		 * @param {int} photoSizing - display type
		 * @memberOf app.PhotoView
		 */
		prep: function(idx, photoSizing) {
			app.Geo.set(_getElements(idx));
			switch (photoSizing) {
				case 0:
					_letterbox(idx);
					break;
				case 2:
					_frame(idx);
					break;
				case 3:
					_stretch(idx);
					break;
				default:
					break;
			}
			_super500px(idx);
		},

		/**
		 * Determine if a photo failed to load (usually 404 error)
		 * @param {int} idx - index into animated pages
		 * @returns {boolean} true if image load failed
		 * @memberOf app.PhotoView
		 */
		isError: function(idx) {
			const e = _getElements(idx);
			return !e.image || e.image.error;
		},

		/**
		 * Determine if a photo has finished loading
		 * @param {int} idx - index into animated pages
		 * @returns {boolean} true if image is loaded
		 * @memberOf app.PhotoView
		 */
		isLoaded: function(idx) {
			const e = _getElements(idx);
			return !!e.image && e.image.loaded;
		},
	};
})();
