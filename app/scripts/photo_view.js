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
	const SCREEN_ASPECT = screen.width / screen.height;

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
		let right;
		let bottom;

		e.author.style.textAlign = 'right';
		e.location.style.textAlign = 'left';
		if (aspect < SCREEN_ASPECT) {
			right = (100 - aspect / SCREEN_ASPECT * 100) / 2;
			e.author.style.right = (right + 1) + 'vw';
			e.author.style.bottom = '';
			e.author.style.width =
				aspect / SCREEN_ASPECT * 100 - 3 + 'vw';
			e.location.style.left = (right + 1) + 'vw';
			e.location.style.bottom = '';
			e.location.style.width =
				aspect / SCREEN_ASPECT * 100 - 3 + 'vw';
			e.time.style.right = (right + 1) + 'vw';
			e.time.style.bottom = '';
		} else {
			bottom = (100 - SCREEN_ASPECT / aspect * 100) / 2;
			e.author.style.bottom = (bottom + 1) + 'vh';
			e.author.style.right = '';
			e.author.style.width = 100 - .5 + 'vw';
			e.location.style.bottom = (bottom + 1) + 'vh';
			e.location.style.left = '';
			e.location.style.width = 100 - .5 + 'vw';
			e.time.style.bottom = (bottom + 3.5) + 'vh';
			e.time.style.right = '';
		}

		if (!app.Utils.isWhiteSpace(e.item.location) &&
			app.Storage.getBool('showLocation')) {
			e.author.style.maxWidth =
				((aspect / SCREEN_ASPECT * 100) / 2 ) - .25 + 'vh';
		}

		e.location.style.maxWidth =
			((aspect / SCREEN_ASPECT * 100) / 2 ) - .25 + 'vh';
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
	 * @private
	 * @memberOf app.PhotoView
	 */
	function _setFrameLabelStyle(el, width, height) {
		el.style.textOverflow = 'ellipsis';
		el.style.whiteSpace = 'nowrap';
		if (app.Storage.getInt('showTime')) {
			el.style.left = (screen.width - width) / 2 + 10 + 'px';
			el.style.textAlign = 'left';
			el.style.width = Math.floor(0.8 * width) + 'px';
		} else {
			el.style.left = (screen.width - width) / 2 + 10 + 'px';
			el.style.width = width - 20 + 'px';
			el.style.textAlign = 'center';
		}
		el.style.bottom = (screen.height - height) / 2 + 10 + 'px';
		el.style.color = 'black';
		el.style.opacity = 0.9;
		el.style.fontSize = '2.5vh';
		el.style.fontWeight = 300;
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
		const showLocation = app.Storage.getBool('showLocation');
		const hasLocation = !!photo.point;
		let padding;
		let border;
		let borderBot;
		let width;
		let height;
		let frWidth;
		let frHeight;

		// scale to screen size
		border = screen.height * 0.005;
		borderBot = screen.height * 0.05;
		padding = screen.height * 0.025;

		let label;
		if (showLocation && hasLocation) {
			// location takes priority over author
			label = '';
		} else {
			// force author for this view
			label = app.Photo.buildAuthorLabel(photo.type, photo.author, true);
		}
		model.set('item.label', label);

		height =
			Math.min((screen.width - padding * 2 - border * 2) / aspect,
				screen.height - padding * 2 - border - borderBot);
		width = height * aspect;

		// size with the frame
		frWidth = width + border * 2;
		frHeight = height + borderBot + border;

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

		_setFrameLabelStyle(author, frWidth, frHeight);
		_setFrameLabelStyle(location, frWidth, frHeight);

		time.style.right = (screen.width - frWidth) / 2 + 10 + 'px';
		time.style.textAlign = 'right';
		time.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
		time.style.color = 'black';
		time.style.opacity = 0.9;
		time.style.fontSize = '3vh';
		time.style.fontWeight = 300;
	}

	/**
	 * Add superscript to the label for 500px photos
	 * @param {int} idx - index into animated pages
	 * @memberOf app.PhotoView
	 * @private
	 */
	function _super500px(idx) {
		const e = _getElements(idx);
		const sup = e.author.querySelector('#sup');
		(e.item.type === '500') ?
			sup.textContent = 'px' : sup.textContent = '';
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
		 * @param {Object} t - Polymer template
		 * @memberOf app.PhotoView
		 */
		prep: function(idx, t) {
			app.Geo.set(_getElements(idx));
			app.PhotoView.setTime(t);
			_super500px(idx);
			switch (t.photoSizing) {
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

		/**
		 * Build and set the time string
		 * @param {Object} t - Polymer template
		 * @memberOf app.PhotoView
		 */
		setTime: function(t) {
			const format = app.Storage.getInt('showTime');
			const date = new Date();
			let timeStr;

			if (format === 0) {
				// don't show time
				timeStr = '';
			} else if (format === 1) {
				// 12 hour format
				timeStr = date.toLocaleTimeString('en-us', {
					hour: 'numeric',
					minute: '2-digit',
					hour12: true,
				});
				if (timeStr.endsWith('M')) {
					// strip off AM/PM
					timeStr = timeStr.substring(0, timeStr.length - 3);
				}
			} else {
				// 24 hour format
				timeStr = date.toLocaleTimeString(navigator.language, {
					hour: 'numeric',
					minute: '2-digit',
					hour12: false,
				});
			}
			t.set('time', timeStr);
		},
	};
})();
