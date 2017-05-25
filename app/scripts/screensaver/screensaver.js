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
	t.itemsAll = [];

	/**
	 * Index into [t.itemsAll]{@link app.ScreenSaver.t.itemsAll}
	 * @type {int}
	 * @memberOf app.ScreenSaver
	 */
	t.curIdx = 0;

	/**
	 * Array of {@link app.Photo} currently loaded into the neon-animated-pages.
	 * Always changing subset of [t.itemsAll]{@link app.ScreenSaver.t.itemsAll}
	 * @type {Array}
	 * @memberOf app.ScreenSaver
	 */
	t.items = [];

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
		t.time = 'time';

		app.SSUtils.setZoom();
		app.SSUtils.setupPhotoSizing(t);

		_processPhotoTransitions();

		// load the photos for the slide show
		app.SSUtils.loadPhotos(t);

		if (!t.noPhotos) {
			// kick off the slide show if there are photos selected
			// slight delay at beginning so we have a smooth start
			t.waitTime = 2000;
			t.timer = window.setTimeout(_runShow, t.waitTime);
		}
	});

	/**
	 * Process settings related to between photo transitions
	 * @memberOf app.ScreenSaver
	 */
	function _processPhotoTransitions() {
		t.transitionType = app.Storage.getInt('photoTransition');
		if (t.transitionType === 8) {
			// pick random transition
			t.transitionType = app.Utils.getRandomInt(0, 7);
		}

		const trans = app.Storage.get('transitionTime');
		t.transitionTime = trans.base * 1000;
		t.waitTime = t.transitionTime;
		t.waitForLoad = true;

		const showTime = app.Storage.getInt('showTime');
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
	 * Try to find a photo that has finished loading
	 * @param {int} idx - index into [t.items]{@link app.ScreenSaver.t.items}
	 * @returns {int} index into t.items of a loaded photo,
	 * -1 if none are loaded
	 * @memberOf app.ScreenSaver
	 */
	function _findLoadedPhoto(idx) {
		if (app.PhotoView.isLoaded(idx)) {
			return idx;
		}
		for (let i = idx + 1; i < t.items.length; i++) {
			if ((i !== t.lastSelected) &&
				(i !== t.p.selected) &&
				app.PhotoView.isLoaded(i)) {
				return i;
			}
		}
		for (let i = 0; i < idx; i++) {
			if ((i !== t.lastSelected) &&
				(i !== t.p.selected) &&
				app.PhotoView.isLoaded(i)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Add the next photo from the master array
	 * @param {int} idx - index into [t.items]{@link app.ScreenSaver.t.items}
	 * @param {boolean} error - true if the photo at idx didn't load
	 * @memberOf app.ScreenSaver
	 */
	function _replacePhoto(idx, error) {
		if (error) {
			// bad url, mark it
			const name = app.PhotoView.getName(idx);
			const index = t.itemsAll.findIndex((element) => {
				return element.name === name;
			});
			if (index !== -1) {
				t.itemsAll[index].name = 'skip';
			}
		}

		if (t.started && (t.itemsAll.length > t.items.length)) {
			let item;
			for (let i = t.curIdx; i < t.itemsAll.length; i++) {
				// find a url that is ok, AFAWK
				item = t.itemsAll[i];
				if (item.name !== 'skip') {
					t.curIdx = i;
					break;
				}
			}
			// add the next image from the master list to this page
			t.rep.set('items.' + idx, JSON.parse(JSON.stringify(item)));
			t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
		}
	}

	/**
	 * Replace the active photos with new photos from the master array
	 * @memberOf app.ScreenSaver
	 */
	function _replaceAllPhotos() {
		if (t.itemsAll.length > t.items.length) {
			let pos = 0;
			let newIdx = t.curIdx;
			for (let i = t.curIdx; i < t.itemsAll.length; i++) {
				newIdx = i;
				const item = t.itemsAll[i];
				if (item.name !== 'skip') {
					if ((pos !== t.lastSelected) &&
						(pos !== t.p.selected)) {
						// don't replace the last two
						t.rep.set('items.' + pos,
							JSON.parse(JSON.stringify(item)));
					}
					pos++;
					if (pos === t.items.length) {
						break;
					}
				}
			}
			t.curIdx = (newIdx === t.itemsAll.length - 1) ? 0 : newIdx + 1;
		}
	}

	/**
	 * Get the next photo to display
	 * @param {int} idx - index into [t.items]{@link app.ScreenSaver.t.items}
	 * @returns {int} next - index into [t.items]{@link app.ScreenSaver.t.items}
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
				idx = (idx === t.items.length - 1) ? 0 : idx + 1;
				ret = _findLoadedPhoto(idx);
			}
		} else if (t.waitTime !== t.transitionTime) {
			// photo found, set the waitTime back to transition time in case
			// it was changed
			t.waitTime = t.transitionTime;
		}
		return ret;
	}

	/**
	 * Called at fixed time intervals to cycle through the photos
	 * Runs forever
	 * @memberOf app.ScreenSaver
	 */
	function _runShow() {
		const curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
		const prevPage = (curPage > 0) ? curPage - 1 : t.items.length - 1;
		let selected = (curPage === t.items.length - 1) ? 0 : curPage + 1;

		// replace the previous selected with the next one from master array
		_replacePhoto(t.lastSelected, false);

		if (app.PhotoView.isError(prevPage)) {
			// broken link, mark it and replace it
			_replacePhoto(prevPage, true);
		}

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
			t.set('time', app.SSUtils.getTime());
			// If a new photo is ready, prep it
			app.PhotoView.prep(selected, t.photoSizing);

			// update t.p.selected so the animation runs
			t.lastSelected = t.p.selected;
			t.p.selected = selected;
		}

		// setup the next timer --- runs forever
		t.timer = window.setTimeout(_runShow, t.waitTime);
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {Object} request - details for the message
	 * @param {Object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @returns {boolean} true if asynchronous
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
				t.set('time', app.SSUtils.getTime());
			}
		}
	}

	/**
	 * Event listener for mouse clicks
	 * Show link to original photo if possible and close windows
	 */
	window.addEventListener('click', function() {
		if (t.p && (t.p.selected !== undefined)) {
			app.Photo.showSource(t.items[t.p.selected]);
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
