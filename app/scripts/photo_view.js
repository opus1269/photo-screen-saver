/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its contributors
 *  may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 *  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 *  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 *  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 *  OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
window.app = window.app || {};
app.PhotoView = (function() {
	'use strict';

	/**
	 * Handle rendering of photo in screen saver
	 * @namespace PhotoView
	 */

	/**
	 * Important components of a photo view
	 * @typedef {Object} Elements
	 * @property {HTMLElement} image - paper-image
	 * @property {HTMLElement} author - label
	 * @property {HTMLElement} time - label
	 * @property {Object} model - template model
	 * @property {Object} item - photo item
	 * @memberOf PhotoView
	 */

	/**
	 * Aspect ratio of screen
	 * @type {Number}
	 * @const
	 * @default
	 * @private
	 * @memberOf PhotoView
	 */
	const SCREEN_ASPECT = screen.width / screen.height;

	/**
	 * Get references to the important elements of a slide
	 * @param {int} idx - index into animated pages
	 * @return {Elements} Object containing the elements of a slide
	 * @private
	 * @memberOf PhotoView
	 */
	function _getElements(idx) {
		const rep = document.querySelector('#repeatTemplate');
		const pages = document.querySelector('#pages');
		const el = pages.querySelector('#item' + idx);
		const ret = {};
		ret.image = el.querySelector('.image');
		ret.author = el.querySelector('.author');
		ret.time = el.querySelector('.time');
		ret.model = rep.modelForElement(ret.image);
		ret.item = ret.model.get('item');
		return ret;
	}

	/**
	 * Finalize DOM for a letter boxed photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf PhotoView
	 */
	function _letterbox(idx) {
		const e = _getElements(idx);
		const aspect = e.item.aspectRatio;
		let right;
		let bottom;

		if (aspect < SCREEN_ASPECT) {
			right = (100 - aspect / SCREEN_ASPECT * 100) / 2;
			e.author.style.right = (right + 1) + 'vw';
			e.author.style.bottom = '';
			e.time.style.right = (right + 1) + 'vw';
			e.time.style.bottom = '';
		} else {
			bottom = (100 - SCREEN_ASPECT / aspect * 100) / 2;
			e.author.style.bottom = (bottom + 1) + 'vh';
			e.author.style.right = '';
			e.time.style.bottom = (bottom + 3.5) + 'vh';
			e.time.style.right = '';
		}
	}

	/**
	 * Finalize DOM for a stretched photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf PhotoView
	 */
	function _stretch(idx) {
		const e = _getElements(idx);
		const img = e.image.$.img;
		img.style.width = '100%';
		img.style.height = '100%';
		img.style.objectFit = 'fill';
	}

	/**
	 * Finalize DOM for a framed photo
	 * @param {int} idx - index into animated pages
	 * @private
	 * @memberOf PhotoView
	 */
	function _frame(idx) {
		const e = _getElements(idx);
		const model = e.model;
		const author = e.author;
		const time = e.time;
		const image = e.image;
		const img = image.$.img;
		const photo = e.item;
		const aspect = photo.aspectRatio;
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

		if (!app.Utils.getBool('showPhotog')) {
			// force use of photo label for this view
			const label = photo.buildLabel(true);
			model.set('item.label', label);
		}

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

		if (app.Utils.getInt('showTime')) {
			author.style.left = (screen.width - frWidth) / 2 + 10 + 'px';
			author.style.textAlign = 'left';
		} else {
			author.style.left = '0';
			author.style.width = screen.width + 'px';
			author.style.textAlign = 'center';
		}
		author.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
		author.style.color = 'black';
		author.style.opacity = 0.9;
		author.style.fontSize = '2.5vh';
		author.style.fontWeight = 300;

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
	 * @memberOf PhotoView
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
		 * @return {String} name of photo
		 * @memberOf PhotoView
		 */
		getName: function(idx) {
			const e = _getElements(idx);
			return e.item.name;
		},

		/**
		 * Finalize DOM for a photo
		 * @param {int} idx - index into animated pages
		 * @param {object} t - Polymer template
		 * @memberOf PhotoView
		 */
		prep: function(idx, t) {
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
		 * @return {boolean} true if image load failed
		 * @memberOf PhotoView
		 */
		isError: function(idx) {
			const e = _getElements(idx);
			return !e.image || e.image.error;
		},

		/**
		 * Determine if a photo has finished loading
		 * @param {int} idx - index into animated pages
		 * @return {boolean} true if image is loaded
		 * @memberOf PhotoView
		 */
		isLoaded: function(idx) {
			const e = _getElements(idx);
			return !!e.image && e.image.loaded;
		},

		/**
		 * Build and set the time string
		 * @param {object} t - Polymer template
		 * @memberOf PhotoView
		 */
		setTime: function(t) {
			const format = app.Utils.getInt('showTime');
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
