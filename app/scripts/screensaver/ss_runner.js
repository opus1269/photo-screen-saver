/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Control the running of a {@link app.SSRunner}
 * @namespace
 */
app.SSRunner = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Mark a photo in [t.photos]{@link app.SSRunner.t.views} as unusable
	 * @param {int} idx - index into [t.views]{@link app.SSRunner.t.views}
	 * @private
	 * @memberOf app.SSRunner
	 */
	function _markPhotoBad(idx) {
		const t = app.Screensaver.getTemplate();
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
	 * @param {int} idx - index into [t.views]{@link app.SSRunner.t.views}
	 * @returns {int} index into t.views, -1 if none are loaded
	 * @memberOf app.SSRunner
	 */
	function _findLoadedPhoto(idx) {
		const t = app.Screensaver.getTemplate();
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
	 * @memberOf app.SSRunner
	 */
	function _replacePhoto(idx, error) {
		const t = app.Screensaver.getTemplate();
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
	 * @memberOf app.SSRunner
	 */
	function _replaceAllPhotos() {
		const t = app.Screensaver.getTemplate();
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
	 * @param {int} idx - index into [t.views]{@link app.SSRunner.t.views}
	 * @returns {int} next - index into [t.views]{@link app.SSRunner.t.views}
	 * to display, -1 if none are ready
	 * @memberOf app.SSRunner
	 */
	function _getNextPhoto(idx) {
		const t = app.Screensaver.getTemplate();
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
	 * @memberOf app.SSRunner
	 */
	function _runShow() {
		const t = app.Screensaver.getTemplate();
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
			app.SSTime.setTime(t);
			t.views[selected].render();
		}

		// setup the next timeout and call ourselves --- runs until interrupted
		window.setTimeout(() => {
			_runShow();
		}, t.waitTime);
	}

	return {
		/**
		 * Start the slideshow
		 * @memberOf app.SSRunner
		 */
		start: function() {
			// slight delay at beginning so we have a smooth start
			window.setTimeout(_runShow, 2000);
		},

		/**
		 * Add the next photo from the master array
		 * @memberOf app.SSRunner
		 */
		replacePhoto: function() {
			const t = app.Screensaver.getTemplate();
			if (t.replaceLast >= 0) {
				_replacePhoto(t.replaceLast, false);
			}

			if (t.views[t.prevPage].isError(t.prevPage)) {
				// broken link, mark it and replace it
				if (t.prevPage >= 0) {
					_replacePhoto(t.prevPage, true);
				}
			}
		},
	};
})();
