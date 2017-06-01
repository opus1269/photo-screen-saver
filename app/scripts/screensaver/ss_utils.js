/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Utility methods for a screensaver
 * @namespace
 */
app.SSUtils = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Max number of animated pages
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.SSUtils
	 */
	const _MAX_PAGES = 20;

	return {
		/**
		 * Set the state when no photos are available
		 * @param {Object} t - screensaver template
		 * @memberOf app.SSUtils
		 */
		setNoPhotos: function(t) {
			if (t && t.$) {
				t.$.noPhotos.style.visibility = 'visible';
				t.$.pages.style.visibility = 'hidden';
				t.noPhotos = true;
			}
		},

		/**
		 * Set the window zoom factor to 1.0
		 * @memberOf app.SSUtils
		 */
		setZoom: function() {
			if (app.Utils.getChromeVersion() >= 42) {
				// override zoom factor to 1.0 - chrome 42 and later
				const chromep = new ChromePromise();
				chromep.tabs.getZoom().then((zoomFactor) => {
					if ((zoomFactor <= 0.99) || (zoomFactor >= 1.01)) {
						chrome.tabs.setZoom(1.0);
					}
					return null;
				}).catch((err) => {
					app.GA.error(err.message, 'chromep.tabs.getZoom');
				});
			}
		},

		/**
		 * Process settings related to the photo's appearance
		 * @param {!Object} t - screensaver template
		 * @memberOf app.SSUtils
		 */
		setupPhotoSizing(t) {
			t.photoSizing = app.Storage.getInt('photoSizing', 0);
			if (t.photoSizing === 4) {
				// pick random sizing
				t.photoSizing = app.Utils.getRandomInt(0, 3);
			}
			switch (t.photoSizing) {
				case 0:
					t.sizingType = 'contain';
					break;
				case 1:
					t.sizingType = 'cover';
					break;
				case 2:
				case 3:
					t.sizingType = null;
					break;
				default:
					t.sizingType = 'contain';
					break;
			}
		},

		/**
		 * Build the Array of {@link app.Photo} objects that will be displayed
		 * @param {!Object} t - screensaver template
		 * @returns {boolean} true if there is at least one photo
		 * @memberOf app.SSUtils
		 */
		loadPhotos: function(t) {
			let sources = app.PhotoSource.getSelectedPhotos();
			sources = sources || [];
			sources.forEach((source) => {
				const type = source.type;
				let ct = 0;
				source.photos.forEach((sourcePhoto) => {
					if (!app.Photo.ignore(sourcePhoto.asp, t.photoSizing)) {
						const photo =
							new app.Photo('photo' + ct, sourcePhoto, type);
						t.photos.push(photo);
						ct++;
					}
				});
			});

			if (!t.photos || (t.photos.length === 0)) {
				// No usable photos, display static image
				app.SSUtils.setNoPhotos(t);
				return false;
			}

			if (app.Storage.getBool('shuffle')) {
				// randomize the order
				app.Utils.shuffleArray(t.photos);
			}
			return true;
		},

		/**
		 * Create the animated pages
		 * @param {!Object} t - screensaver template
		 * @memberOf app.SSUtils
		 */
		createPages: function(t) {
			const len = Math.min(t.photos.length, _MAX_PAGES);
			for (let i = 0; i < len; i++) {
				const photo = t.photos[i];
				const view = app.SSView.createView(photo, t.photoSizing);
				t.push('views', view);
				t.curIdx++;
			}

			// force update of animated pages
			t.rep.render();

			// set the Elements of the view
			t.views.forEach((view, index) => {
				const el = t.p.querySelector('#item' + index);
				const image = el.querySelector('.image');
				const author = el.querySelector('.author');
				const time = el.querySelector('.time');
				const location = el.querySelector('.location');
				const model = t.rep.modelForElement(el);
				view.setElements(image, author, time, location, model);
			});
		},

		/**
		 * Get the current time as a string
		 * @returns {string} time string suitable for display
		 * @memberOf app.SSUtils
		 */
		getTime: function() {
			const format = app.Storage.getInt('showTime', 0);
			let timeString = '';

			if (!Number.isNaN(format) && (format > 0)) {
				timeString = app.Time.getStringShort();
			}
			return timeString;
		},

		/**
		 * Close ourselves
		 * @memberOf app.SSUtils
		 */
		close: function() {
			// send message to other screen savers to close themselves
			app.Msg.send(app.Msg.SS_CLOSE).catch(() => {});

			setTimeout(function() {
				// delay a little to process events
				window.close();
			}, 750);
		},
	};
})();
