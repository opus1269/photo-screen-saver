/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * A screensaver
 * @namespace
 */
app.Screensaver = (function() {
	'use strict';

	new ExceptionHandler();

	// set selected background image
	document.body.style.background =
		app.Storage.get('background').substring(11);

	/**
	 * main auto-bind template
	 * @type {Object}
	 * @const
	 * @private
	 * @memberOf app.Screensaver
	 */
	const t = document.querySelector('#t');

	// repeat template
	t.rep = null;

	// neon-animated-pages element
	t.p = null;

	/**
	 * Array of all the {@link app.Photo} objects to use for the slide show
	 * @type {Array}
	 * @memberOf app.Screensaver
	 */
	t.photos = [];

	/**
	 * Array of {@link app.SSView} objects bound to the neon-animated-pages.
	 * The {@link app.Photo} property is an always changing subset of
	 * [t.photos]{@link app.Screensaver.t.photos}
	 * @type {Array}
	 * @memberOf app.Screensaver
	 */
	t.views = [];

	/**
	 * The way the photos are rendered
	 * @type {int}
	 */
	t.sizingType = 0;

	/**
	 * The animation type for between photo transitions
	 * @type {int}
	 */
	t.aniType = 0;

	// Flag to indicate the screen saver has no photos
	t.noPhotos = false;

	/**
	 * Event Listener for template bound event to know when bindings
	 * have resolved and content has been stamped to the page
	 * @memberOf app.Screensaver
	 */
	t.addEventListener('dom-change', function() {
		// listen for chrome messages
		app.Msg.listen(app.SSEvents.onMessage);

		// listen for keydown events
		window.addEventListener('keydown', app.SSEvents.onKeyDown, false);

		// listen for mousemove events
		window.addEventListener('mousemove', app.SSEvents.onMouseMove, false);

		// listen for mouse click events
		window.addEventListener('click', app.SSEvents.onMouseClick, false);

		app.GA.page('/screensaver.html');

		t.rep = t.$.repeatTemplate;
		t.p = t.$.pages;

		app.SSUtils.setZoom();
		app.SSUtils.setupPhotoSizing();
		_processPhotoTransitions();

		// load the photos for the slide show
		const hasPhotos = app.SSUtils.loadPhotos();
		if (hasPhotos) {
			// create the animated pages
			app.SSUtils.createPages();

			// kick off the slide show if there are photos selected
			app.SSRunner.start();
		}
	});

	/**
	 * Event: Slide animation finished
	 * @memberOf app.Screensaver
	 */
	t._OnAniFinished = function() {
		// replace the previous selected with the next one from master array
		// do it here so the web request doesn't run during the animation
		app.SSRunner.replacePhoto();
	};

	/**
	 * Computed binding: No photos label
	 * @returns {string} i18n label
	 * @memberOf app.Screensaver
	 */
	t._computeNoPhotosLabel = function() {
		return `${app.Utils.localize('no')} ${app.Utils.localize('photos')}`;
	};

	/**
	 * Process settings related to between photo transitions
	 * @private
	 * @memberOf app.Screensaver
	 */
	function _processPhotoTransitions() {
		let type = app.Storage.getInt('photoTransition', 0);
		if (type === 8) {
			// pick random transition
			type = app.Utils.getRandomInt(0, 7);
		}
		t.set('aniType', type);

		app.SSTime.setUpTransitionTime();
	}

	return {
		/**
		 * Get reference to the auto-binding template
		 * @returns {Object} The auto-binding template
		 * @memberOf app.Screensaver
		 */
		getTemplate: function() {
			return t;
		},
	};
})();
