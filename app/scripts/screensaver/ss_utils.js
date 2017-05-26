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
		 * Process settings related to a photo's appearance
		 * @param {Object} t - screensaver template
		 * @memberOf app.SSUtils
		 */
		setupPhotoSizing(t) {
			t.photoSizing = app.Storage.getInt('photoSizing');
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
					break;
			}
		},

		/**
		 * Build the Array of {@link app.Photo} objects that will be displayed
		 * and populate the neon-animated-pages
		 * @param {Object} t - screensaver template
		 * @memberOf app.SSUtils
		 */
		loadPhotos: function(t) {

			// populate t.itemsAll with selected photos
			let sources = app.PhotoSource.getSelectedPhotos();
			sources = sources || [];
			sources.forEach((source) => {
				const type = source.type;
				let ct = 0;
				source.photos.forEach((sourcePhoto) => {
					if (!app.Photo.ignore(sourcePhoto.asp, t.photoSizing)) {
						const photo =
							new app.Photo('photo' + ct, sourcePhoto, type);
						t.itemsAll.push(photo);
					}
				});
			});

			if (app.Storage.getBool('shuffle')) {
				// randomize the order
				app.Utils.shuffleArray(t.itemsAll);
			}

			// create the animatable pages
			const ct = Math.min(t.itemsAll.length, _MAX_PAGES);
			for (let i = 0; i < ct; i++) {
				const photo = t.itemsAll[i];
				// shallow copy
				t.push('items', JSON.parse(JSON.stringify(photo)));
				t.curIdx++;
			}

			if (!t.itemsAll || (t.itemsAll.length === 0)) {
				// No usable photos, display static image
				t.$.noPhotos.style.visibility = 'visible';
				t.noPhotos = true;
			}
		},

		/**
		 * Get the current time as a string
		 * @returns {string} time string suitable for display
		 * @memberOf app.SSUtils
		 */
		getTime: function() {
			const format = app.Storage.getInt('showTime');
			const date = new Date();
			let timeStr = '';

			if (format === 1) {
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
			return timeStr;
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
