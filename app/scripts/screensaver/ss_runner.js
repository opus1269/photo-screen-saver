/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Control the running of a {@link app.Screensaver}
 * @namespace
 */
app.SSRunner = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * History item
   * @typedef {Object} app.SSRunner.HistoryItem
   * @property {int} viewsIdx - t.views index
   * @property {int} lastViewsIdx - t.views index
   * @property {int} photoId - t.photos index
   * @property {int} photosPos - pointer into t.photos
   * @memberOf app.SSRunner
   */

  /**
   * Slide show history
   * @const
   * @type {{arr: Array<app.SSRunner.HistoryItem>, idx: number, max: number}}
   * @property {Array<app.SSRunner.HistoryItem>} arr - history items
   * @property {int} idx - pointer into arr
   * @property {int} max - max length or arr, it will actually have 1 item more
   * @private
   * @memberOf app.SSRunner
   */
  const history = {
    arr: [],
    idx: -1,
    max: 20,
  };

  /**
   * Instance variables
   * @type {Object}
   * @property {boolean} started - true if slideshow started
   * @property {int} lastSelected - last selected page
   * @property {int} waitTime - wait time when looking for photo in milliSecs
   * @property {boolean} interactive - is interaction allowed
   * @property {boolean} paused - is screensaver paused
   * @property {number} timeOutId - id of setTimeout
   * @private
   * @memberOf app.SSRunner
   */
  const _VARS = {
    started: false,
    lastSelected: -1,
    waitTime: 30000,
    interactive: false,
    paused: false,
    timeOutId: 0,
  };

  /**
   * Stop the animation
   * @private
   * @memberOf app.SSRunner
   */
  function _stop() {
    window.clearTimeout(_VARS.timeOutId);
   }

  /**
   * Restart the slideshow
   * @param {?int} [newIdx=null] optional idx to use for current idx
   * @private
   * @memberOf app.SSRunner
   */
  function _restart(newIdx = null) {
    const transTime = Chrome.Storage.get('transitionTime');
    if (transTime) {
      app.SSRunner.setWaitTime(transTime.base * 1000);
    }
    _runShow(newIdx);
  }

  /**
   * Increment the slide show manually
   * @param {?int} [newIdx=null] optional idx to use for current idx
   * @private
   * @memberOf app.SSRunner
   */
  function _step(newIdx = null) {
    if (app.SSRunner.isPaused()) {
      app.SSRunner.togglePaused(newIdx);
      app.SSRunner.togglePaused();
    } else {
      _stop();
      _restart(newIdx);
    }
  }

  /**
   * Track the history of the photo traversal
   * @param {?int} newIdx - if not null, a request from the back command
   * @param {int} selection - the current selection
   * @private
   * @memberOf app.SSRunner
   */
  function _trackHistory(newIdx, selection) {
    const t = app.Screensaver.getTemplate();
    const idx = history.idx;
    const len = history.arr.length;
    if (newIdx === null) {
      const photoName = t.views[selection].getPhotoName();
      const photoId = parseInt(photoName.match(/\d+/)[0], 10);
      const photosPos = app.SSFinder.getPhotosIndex();
      if ((idx === len - 1)) {
        if (history.arr.length > history.max) {
          // FIFO delete
          history.arr.shift();
          history.idx--;
          history.idx = Math.max(history.idx, -1);
        }
        // add newest photo
        history.arr.push({
          viewsIdx: selection,
          lastViewsIdx: _VARS.lastSelected,
          photoId: photoId,
          photosPos: photosPos,
        });
      }
    }

    history.idx++;
  }

  /**
   * Self called at fixed time intervals to cycle through the photos
   * @param {?int} [newIdx=null] override selected
   * @private
   * @memberOf app.SSRunner
   */
  function _runShow(newIdx = null) {
    const t = app.Screensaver.getTemplate();
    if (t.noPhotos) {
      // no usable photos to show
      return;
    }

    let curIdx = (newIdx === null) ? t.p.selected : newIdx;
    curIdx = !app.SSRunner.isStarted() ? 0 : curIdx;
    const prevIdx = (curIdx > 0) ? curIdx - 1 : t.views.length - 1;
    let nextIdx = (curIdx === t.views.length - 1) ? 0 : curIdx + 1;

    if (!app.SSRunner.isStarted()) {
      // special case for first page. neon-animated-pages is configured
      // to run the entry animation for the first selection
      nextIdx = 0;
    }

    nextIdx = app.SSFinder.getNext(nextIdx, _VARS.lastSelected, prevIdx);
    if (nextIdx !== -1) {
      // the next photo is ready

      // track the photo history
      _trackHistory(newIdx, nextIdx);

      if (!app.SSRunner.isStarted()) {
        _VARS.started = true;
        app.SSTime.setTime();
      }

      // setup photo
      t.views[nextIdx].render();

      // update t.p.selected so the animation runs
      _VARS.lastSelected = t.p.selected;
      t.p.selected = nextIdx;
    }

    if (newIdx === null) {
      // load next photo from master array
      app.SSFinder.replacePhoto();
    }

    // set the next timeout, then call ourselves - runs unless interrupted
    _VARS.timeOutId = window.setTimeout(() => {
      _runShow();
    }, _VARS.waitTime);
  }

  return {
    /**
     * Start the slideshow
     * @memberOf app.SSRunner
     */
    start: function() {
      const transTime = Chrome.Storage.get('transitionTime');
      if (transTime) {
        app.SSRunner.setWaitTime(transTime.base * 1000);
      }
      _VARS.interactive = Chrome.Storage.get('interactive');

      history.max = Math.min(app.SSFinder.getPhotosCount(), history.max);

      // start slide show. slight delay at beginning so we have a smooth start
      window.setTimeout(_runShow, 2000);
    },

    /**
     * Get wait time between _runShow calls
     * @returns {int} current wait time
     * @memberOf app.SSRunner
     */
    getWaitTime: function() {
      return _VARS.waitTime;
    },

    /**
     * Set wait time between _runShow calls in milliSecs
     * @param {int} waitTime - wait time for next attempt to get photo
     * @memberOf app.SSRunner
     */
    setWaitTime: function(waitTime) {
      _VARS.waitTime = waitTime;
    },

    /**
     * Has the first page run
     * @returns {boolean} if animation has started
     * @memberOf app.SSRunner
     */
    isStarted: function() {
      return _VARS.started;
    },
    /**
     * Is interactive mode allowed
     * @returns {boolean} true if allowed
     * @memberOf app.SSRunner
     */
    isInteractive: function() {
      return _VARS.interactive;
    },

    /**
     * Are we paused
     * @returns {boolean} true if paused
     * @memberOf app.SSRunner
     */
    isPaused: function() {
      return _VARS.paused;
    },

    /**
     * Is the given idx a part of the current animation pair
     * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
     * @returns {boolean} if selected or last selected
     * @memberOf app.SSRunner
     */
    isCurrentPair: function(idx) {
      const t = app.Screensaver.getTemplate();
      return ((idx === t.p.selected) || (idx === _VARS.lastSelected));
    },

    /**
     * Reset the slide show history
     * @memberOf app.SSRunner
     */
    clearHistory: function() {
      history.arr = [];
      history.idx = -1;
    },

    /**
     * Toggle paused state of the slideshow
     * @param {?int} [newIdx=null] optional idx to use for current idx
     * @memberOf app.SSRunner
     */
    togglePaused: function(newIdx = null) {
      if (_VARS.started) {
        _VARS.paused = !_VARS.paused;
        app.Screensaver.setPaused(_VARS.paused);
        if (_VARS.paused) {
          _stop();
        } else {
          _restart(newIdx);
        }
      }
    },

    /**
     * Forward one slide
     * @memberOf app.SSRunner
     */
    forward: function() {
      if (_VARS.started) {
        _step();
      }
    },

    /**
     * Backup one slide
     * @memberOf app.SSRunner
     */
    back: function() {
      if (!_VARS.started) {
        return;
      }
      if (history.idx <= 0) {
        // at beginning
        return;
      }

      const t = app.Screensaver.getTemplate();
      let nextStep = null;
      let idx = history.idx - 2;
      history.idx = idx;
      if (idx < 0) {
        if ((history.arr.length > history.max)) {
          // at beginning of history
          history.idx+= 2;
          return;
        } else {
          // at beginning, first time through
          nextStep = -1;
          idx = 0;
        }
      }

      // update state from history
      const photosPos = history.arr[idx].photosPos;
      const photoId = history.arr[idx].photoId;
      const viewsIdx = history.arr[idx].viewsIdx;
      nextStep = (nextStep === null) ? viewsIdx : nextStep;
      app.SSFinder.setPhotosIndex(photosPos);
      _VARS.lastSelected = history.arr[idx].lastViewsIdx;
      t.views[viewsIdx].setPhoto(t.photos[photoId]);
      t.views[viewsIdx].render();

      _step(nextStep);
    },
  };
})();
