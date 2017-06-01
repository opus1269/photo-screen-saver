/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	'use strict';

	/**
	 * Display a screen saver
	 * @namespace app.ScreenSaver
	 */

	new ExceptionHandler();

	/**
	 * repeating alarm for updating time label
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.ScreenSaver
	 */
	const _CLOCK_ALARM = 'updateTimeLabel';

	// set selected background image
	document.body.style.background =
		app.Storage.get('background').substring(11);

	/**
	 * main auto-bind template
	 * @type {Object}
	 * @const
	 * @private
	 * @memberOf app.ScreenSaver
	 */
	const t = document.querySelector('#t');

	// repeat template
	t.rep = null;

	// neon-animated-pages element
	t.p = null;

	/**
	 * array of all the {@link app.Photo} to use for slide show
	 * @type {Array}
	 * @memberOf app.ScreenSaver
	 */
	t.photos = [];

	/**
	 * Index into [t.photos]{@link app.ScreenSaver.t.photos}
	 * @type {int}
	 * @memberOf app.ScreenSaver
	 */
	t.curIdx = 0;

	/**
	 * Array of {@link app.SSView} objects bound to the neon-animated-pages.
	 * The {@link app.Photo} property is an always changing subset of
	 * [t.photos]{@link app.ScreenSaver.t.photos}
	 * @type {Array}
	 * @memberOf app.ScreenSaver
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
	 * @memberOf app.ScreenSaver
	 */
	t.addEventListener('dom-change', function() {
		// listen for chrome messages
		app.Msg.listen(_onMessage);

		app.GA.page('/screensaver.html');

		t.rep = t.$.repeatTemplate;
		t.p = t.$.pages;
		t.time = '';

		app.SSUtils.setZoom();
		app.SSUtils.setupPhotoSizing(t);
		_processPhotoTransitions();

		// load the photos for the slide show
		if (app.SSUtils.loadPhotos(t)) {
			// create the animated pages
			app.SSUtils.createPages(t);

			// kick off the slide show if there are photos selected
			// slight delay at beginning so we have a smooth start
			t.waitTime = 2000;
			t.timer = window.setTimeout(_runShow, t.waitTime);
		}
	});

	/**
	 * Event: Slide animation finished
	 * @memberOf app.ScreenSaver
	 */
	t._OnAniFinished = function() {
		// replace the previous selected with the next one from master array
		// do it here so the web request doesn't run during transition
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
	 * Computed property: No photos label
	 * @returns {string} i18n label
	 * @memberOf app.ScreenSaver
	 */
	t._computeNoPhotos = function() {
		return `${app.Utils.localize('no')} ${app.Utils.localize('photos')}`;
	};

	/**
	 * Process settings related to between photo transitions
	 * @memberOf app.ScreenSaver
	 */
	function _processPhotoTransitions() {
		t.transitionType = app.Storage.getInt('photoTransition', 0);
		if (t.transitionType === 8) {
			// pick random transition
			t.transitionType = app.Utils.getRandomInt(0, 7);
		}

		const trans = app.Storage.get('transitionTime');
		t.transitionTime = trans.base * 1000;
		t.waitTime = t.transitionTime;
		t.waitForLoad = true;

		const showTime = app.Storage.getInt('showTime', 0);
		if ((showTime !== 0) && (trans.base > 60)) {
			// add repeating alarm to update time label
			// if transition time is more than 1 minute
			// and time label is showing
			chrome.alarms.onAlarm.addListener(_onAlarm);

			const chromep = new ChromePromise();
			chromep.alarms.get(_CLOCK_ALARM).then((alarm) => {
				if (!alarm) {
					chrome.alarms.create(_CLOCK_ALARM, {
						when: Date.now(),
						periodInMinutes: 1,
					});
				}
				return null;
			}).catch((err) => {
				app.GA.error(err.message, 'chromep.alarms.get(CLOCK_ALARM)');
			});
		}
	}

	/**
	 * Set the time label
	 * @private
	 * @memberOf app.ScreenSaver
	 */
	function _setTime() {
		const showTime = app.Storage.getInt('showTime', 0);
		if (showTime !== 0) {
			t.set('time', app.SSUtils.getTime());
		} else {
			t.set('time', '');
		}
	}

	/**
	 * Mark a photo in [t.photos]{@link app.ScreenSaver.t.views} as unusable
	 * @param {int} idx - index into [t.views]{@link app.ScreenSaver.t.views}
	 * @private
	 * @memberOf app.ScreenSaver
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
				app.SSUtils.setNoPhotos(t);
			}
		}
	}

	/**
	 * Try to find a photo that has finished loading
	 * @param {int} idx - index into [t.views]{@link app.ScreenSaver.t.views}
	 * @returns {int} index into t.views, -1 if none are loaded
	 * @memberOf app.ScreenSaver
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
	 * @param {int} idx - index into [t.views]{@link app.ScreenSaver.t.views}
	 * @param {boolean} error - true if the photo at idx didn't load
	 * @memberOf app.ScreenSaver
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
	 * @memberOf app.ScreenSaver
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
	 * @param {int} idx - index into [t.views]{@link app.ScreenSaver.t.views}
	 * @returns {int} next - index into [t.views]{@link app.ScreenSaver.t.views}
	 * to display, -1 if none are ready
	 * @memberOf app.ScreenSaver
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
	 * @memberOf app.ScreenSaver
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
			// If a new photo is ready, render it
			_setTime();
			t.views[selected].render();

			t.lastSelected = t.p.selected;
			// update t.p.selected so the animation runs
			t.p.selected = selected;
		}

		// setup the next timeout and call ourselves --- runs until interrupted
		window.setTimeout(() => {
			_runShow();
		}, t.waitTime);
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {app.Msg.Message} request - details for the message
	 * @param {Object} [sender] - MessageSender object
	 * @param {Function} [response] - function to call once after processing
	 * @returns {boolean} true if asynchronous
	 * @private
	 * @memberOf app.ScreenSaver
	 */
	function _onMessage(request, sender, response) {
		if (request.message === app.Msg.SS_CLOSE.message) {
			app.SSUtils.close();
		} else if(request.message === app.Msg.SS_IS_SHOWING.message) {
			// let people know we are here
			response({message: 'OK'});
		}
		return false;
	}

	/**
	 * Event: Listen for alarms
	 * @param {Object} alarm - chrome alarm
	 * @param {string} alarm.name - alarm type
	 * @memberOf app.ScreenSaver
	 */
	function _onAlarm(alarm) {
		if (alarm.name === _CLOCK_ALARM) {
			// update time label
			if (t.p && (t.p.selected !== undefined)) {
				_setTime();
			}
		}
	}

	/**
	 * Event listener for mouse clicks
	 * Show link to original photo if possible and close windows
	 */
	window.addEventListener('click', function() {
		if (t.p && (t.p.selected !== undefined)) {
			app.Photo.showSource(t.views[t.p.selected].photo);
		}
		app.SSUtils.close();
	}, false);

	/**
	 * Event listener for key press
	 * Close window (prob won't work on Chrome OS)
	 */
	window.addEventListener('keydown', function() {
		app.SSUtils.close();
	}, false);

	/**
	 * Event listener for mouse move
	 * Close window
	 */
	window.addEventListener('mousemove', function(event) {
		if (t.startMouse.x && t.startMouse.y) {
			const deltaX = Math.abs(event.clientX - t.startMouse.x);
			const deltaY = Math.abs(event.clientY - t.startMouse.y);
			if (Math.max(deltaX, deltaY) > 10) {
				// close after a minimum amount of mouse movement
				app.SSUtils.close();
			}
		} else {
			// first move, set values
			t.startMouse.x = event.clientX;
			t.startMouse.y = event.clientY;
		}
	}, false);
})();
