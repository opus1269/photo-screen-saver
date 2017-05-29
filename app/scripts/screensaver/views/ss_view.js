/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	window.app = window.app || {};

	'use strict';

	new ExceptionHandler();

	/**
	 * Screensaver zoom view and base class for other SSView classes
	 * @property {Element} image - paper-image
	 * @property {Element} author - label
	 * @property {Element} time - label
	 * @property {Element} location - Geo location
	 * @property {Object} model - template item model
	 * @alias app.SSView
	 */
	app.SSView = class SSView {

		/**
		 * Create a new SSView
		 * @param {app.Photo} photo - photo item
		 * @constructor
		 */
		constructor(photo) {
			// shallow copy
			this.photo = JSON.parse(JSON.stringify(photo));
			this.image = null;
			this.author = null;
			this.time = null;
			this.location = null;
			this.model = null;
		}

		/**
		 * Factory Method to create a new View
		 * @param {app.Photo} photo - photo item
		 * @param {int} sizing - photo sizing type
		 * @returns {app.SSView} a new SSView or subclass
		 * @static
		 */
		static createView(photo, sizing) {
			switch (sizing) {
				case 0:
					return new app.SSViewLetterbox(photo);
				case 1:
					return new app.SSView(photo);
				case 2:
					return new app.SSViewFrame(photo);
				case 3:
					return new app.SSViewFull(photo);
				default:
					throw new TypeError(`Unknown SSView type: ${sizing}`);
			}
		}

		/**
		 * Should we show the location, if available
		 * @returns {boolean} true if we should show the location
		 * @static
		 */
		static _showLocation() {
			return app.Storage.getBool('showLocation');
		}

		/**
		 * Does a photo have an author label to show
		 * @returns {boolean} true if we should show the author
		 */
		_hasAuthor() {
			return !!this.photo.label;
		}

		/**
		 * Does a photo have a geolocation
		 * @returns {boolean} true if geolocation point is non-null
		 */
		_hasLocation() {
			return !!this.photo.point;
		}

		/**
		 * Add superscript to the label for 500px photos
		 * @private
		 */
		_super500px() {
			const type = this.photo.type;
			const authorText = this.photo.label;
			const sup = this.author.querySelector('#sup');
			sup.textContent = '';
			if (!app.Utils.isWhiteSpace(authorText) && (type === '500')) {
				sup.textContent = 'px';
			}
		}

		/**
		 * Set the style for the time label
		 */
		_setTimeStyle() {
			if (app.Storage.getBool('largeTime')) {
				this.time.style.fontSize = '8.5vh';
				this.time.style.fontWeight = 300;
			}
		}

		/**
		 * Set the geolocation text
		 */
		_setLocation() {
			if (app.SSView._showLocation() && this._hasLocation()) {
				app.Geo.get(this.photo.point).then((location) => {
					if (this.model) {
						this.model.set('item.photo.location', location);
					}
					return Promise.resolve();
				}).catch((err) => {
					const networkErr = app.Utils.localize('err_network');
					if (!err.message.includes(networkErr)) {
						app.GA.error(err.message, 'SSView._setLocation');
					}
				});
			}
		}

		/**
		 * Set the elements of the view
		 * @param {Element} image - paper-image, photo
		 * @param {Element} author - div, photographer
		 * @param {Element} time - div, current time
		 * @param {Element} location - div, geolocation text
		 * @param {Object} model - template item model
		 */
		setElements(image, author, time, location, model) {
			this.image = image;
			this.author = author;
			this.time = time;
			this.location = location;
			this.model = model;

			this._setTimeStyle();
			this._setLocation();
			this._super500px();
		}

		/**
		 * Set the photo
		 * @param {app.Photo} photo - a photo to render
		 */
		setPhoto(photo) {
			// shallow copy
			const photoCopy = JSON.parse(JSON.stringify(photo));
			if (this.model) {
				this.model.set('item.photo', photoCopy);
			}
			this._setLocation();
			this._super500px();
		}

		/**
		 * Get the name of the photo in this view
		 * @returns {string} name of photo
		 */
		getName() {
			return this.photo.name;
		}

		/**
		 * Render the page for display - the default CSS is for our view
		 * subclasses override to determine the look of photo
		 */
		render() {}

		/**
		 * Determine if a photo failed to load (usually 404 error)
		 * @returns {boolean} true if image load failed
		 */
		isError() {
			return !this.image || this.image.error;
		}

		/**
		 * Determine if a photo has finished loading
		 * @returns {boolean} true if image is loaded
		 */
		isLoaded() {
			return !!this.image && this.image.loaded;
		}
	};
})();
