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
	 * array of all the {@link app.Photo} to use for slide show
	 * @type {Array}
	 * @memberOf app.Screensaver
	 */
	t.photos = [];

	/**
	 * Index into [t.photos]{@link app.Screensaver.t.photos}
	 * @type {int}
	 * @memberOf app.Screensaver
	 */
	t.curIdx = 0;

	/**
	 * Array of {@link app.SSView} objects bound to the neon-animated-pages.
	 * The {@link app.Photo} property is an always changing subset of
	 * [t.photos]{@link app.Screensaver.t.photos}
	 * @type {Array}
	 * @memberOf app.Screensaver
	 */
	t.views = [];

	// the last selected page
	t.lastSelected = -1;

	// true after first full page animation
	t.started = false;

	// Flag to indicate the screen saver has no photos
	t.noPhotos = false;

	// Starting mouse position
	t.startMouse = {x: null, y: null};

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
		t.time = '';

		app.SSUtils.setZoom();
		app.SSUtils.setupPhotoSizing();
		_processPhotoTransitions();

		// load the photos for the slide show
		if (app.SSUtils.loadPhotos()) {
			// create the animated pages
			app.SSUtils.createPages();

			// kick off the slide show if there are photos selected
			// slight delay at beginning so we have a smooth start
			t.waitTime = 2000;
			t.timer = window.setTimeout(_runShow, t.waitTime);
		}
	});

	/**
	 * Event: Slide animation finished
	 * @memberOf app.Screensaver
	 */
	t._OnAniFinished = function() {
		// replace the previous selected with the next one from master array
		// do it here so the web request doesn't run during the animation
		if (t.replaceLast >= 0) {
			_replacePhoto(t.replaceLast, false);
		}

		if (t.views[t.prevPage].isError(t.prevPage)) {
			// broken link, mark it and replace it
			if (t.prevPage >= 0) {
				_replacePhoto(t.prevPage, true);
			}
		}
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
		t.transitionType = app.Storage.getInt('photoTransition', 0);
		if (t.transitionType === 8) {
			// pick random transition
			t.transitionType = app.Utils.getRandomInt(0, 7);
		}

		app.SSTime.setUpTransitionTime();
	}

	/**
	 * Mark a photo in [t.photos]{@link app.Screensaver.t.views} as unusable
	 * @param {int} idx - index into [t.views]{@link app.Screensaver.t.views}
	 * @private
	 * @memberOf app.Screensaver
	 */
	function _markPhotoBad(idx) {
		const name = t.views[idx].getName();
		const index = t.photos.findIndex((item) => {
			return item.name === name;
		});
		if (index !== -1) {
			t.photos[index].name = 'skip';
			const skipAll = t.photos.every((item) => {
				return item.name === 'skip';
			});
			if (skipAll) {
				// if all items are bad set no photos state
				app.SSUtils.setNoPhotos();
			}
		}
	}

	/**
	 * Try to find a photo that has finished loading
	 * @param {int} idx - index into [t.views]{@link app.Screensaver.t.views}
	 * @returns {int} index into t.views, -1 if none are loaded
	 * @memberOf app.Screensaver
	 */
	function _findLoadedPhoto(idx) {
		if (t.views[idx].isLoaded()) {
			return idx;
		}
		// wrap-around loop: https://stackoverflow.com/a/28430482/4468645
		for (let i = 0; i < t.views.length; i++) {
			const index = (i + idx) % t.views.length;
			const view = t.views[index];
			if ((index === t.lastSelected) || (index === t.p.selected)) {
				// don't use current animation pair
				continue;
			}
			if (view.isLoaded()) {
				return index;
			} else if (view.isError()) {
				_markPhotoBad(index);
			}
		}
		return -1;
	}

	/**
	 * Add the next photo from the master array
	 * @param {int} idx - index into [t.views]{@link app.Screensaver.t.views}
	 * @param {boolean} error - true if the photo at idx didn't load
	 * @memberOf app.Screensaver
	 */
	function _replacePhoto(idx, error) {
		if (error) {
			// bad url, mark it
			_markPhotoBad(idx);
		}

		if (t.started && (t.photos.length > t.views.length)) {
			let item;
			for (let i = t.curIdx; i < t.photos.length; i++) {
				// find a url that is ok, AFAWK
				item = t.photos[i];
				if (item.name !== 'skip') {
					t.curIdx = i;
					break;
				}
			}
			// add the next image from the master list to this page
			t.views[idx].setPhoto(item);
			t.curIdx = (t.curIdx === t.photos.length - 1) ? 0 : t.curIdx + 1;
		}
	}

	/**
	 * Replace the active photos with new photos from the master array
	 * @memberOf app.Screensaver
	 */
	function _replaceAllPhotos() {
		if (t.photos.length > t.views.length) {
			let pos = 0;
			let newIdx = t.curIdx;
			for (let i = t.curIdx; i < t.photos.length; i++) {
				newIdx = i;
				const item = t.photos[i];
				if (item.name !== 'skip') {
					if ((pos === t.lastSelected) || (pos === t.p.selected)) {
						// don't replace current animation pair
						continue;
					}
					// replace photo
					t.views[pos].setPhoto(item);
					pos++;
					if (pos === t.views.length) {
						break;
					}
				}
			}

			t.curIdx = (newIdx === t.photos.length - 1) ? 0 : newIdx + 1;
		}
	}

	/**
	 * Get the next photo to display
	 * @param {int} idx - index into [t.views]{@link app.Screensaver.t.views}
	 * @returns {int} next - index into [t.views]{@link app.Screensaver.t.views}
	 * to display, -1 if none are ready
	 * @memberOf app.Screensaver
	 */
	function _getNextPhoto(idx) {
		let ret = _findLoadedPhoto(idx);
		if (ret === -1) {
			if (t.waitForLoad) {
				// no photos ready.. wait a little and try again the first time
				t.waitTime = 2000;
				t.waitForLoad = false;
			} else {
				// tried waiting for load, now replace the current photos
				t.waitTime = 200;
				_replaceAllPhotos();
				idx = (idx === t.views.length - 1) ? 0 : idx + 1;
				ret = _findLoadedPhoto(idx);
				if (ret !== -1) {
					t.waitForLoad = true;
				}
			}
		} else if (t.waitTime !== t.transitionTime) {
			// photo found, set the waitTime back to transition time
			t.waitTime = t.transitionTime;
		}
		return ret;
	}

	/**
	 * Called at fixed time intervals to cycle through the photos
	 * Potentially runs forever
	 * @memberOf app.Screensaver
	 */
	function _runShow() {
		if (t.noPhotos) {
			// no usable photos to show
			return;
		}

		const curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
		const prevPage = (curPage > 0) ? curPage - 1 : t.views.length - 1;
		let selected = (curPage === t.views.length - 1) ? 0 : curPage + 1;

		// for replacing the page in _onAniFinished
		t.replaceLast = t.lastSelected;
		t.prevPage = prevPage;

		if (t.p.selected === undefined) {
			// special case for first page. neon-animated-pages is configured
			// to run the entry animation for the first selection
			selected = curPage;
		} else if (!t.started) {
			// special case for first full animation. next time ready to start
			// splicing in the new images
			t.started = true;
		}

		selected = _getNextPhoto(selected);
		if (selected !== -1) {
			// update t.p.selected so the animation runs
			t.lastSelected = t.p.selected;
			t.p.selected = selected;

			// setup photo
			app.SSTime.setTime();
			t.views[selected].render();
		}

		// setup the next timeout and call ourselves --- runs until interrupted
		window.setTimeout(() => {
			_runShow();
		}, t.waitTime);
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
