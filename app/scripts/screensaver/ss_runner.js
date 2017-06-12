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
   * Instance variables
   * @type {Object}
   * @property {boolean} started - true if slideshow started
   * @property {int} lastSelected - last selected page
   * @property {int} waitTime - wait time when looking for photo in milliSecs
   * @property {boolean} paused - is screensaver paused
   * @property {number} timeOutId - id of setTimeout
   * @property {Object} history - slide show history
   * @property {int} historyIdx - index into history
   * @property {int} maxHistory - max size of history
   * @private
   * @memberOf app.SSRunner
   */
  const _VARS = {
    started: false,
    lastSelected: -1,
    waitTime: 30000,
    paused: false,
    timeOutId: 0,
    history: {
      arr: [],
      idx: -1,
      max: 100,
    },
  };

  /**
   * Stop the animation
   * @memberOf app.SSRunner
   */
  function _stop() {
    window.clearTimeout(_VARS.timeOutId);
    // because animation may be interrupted
    app.SSFinder.replacePhoto();
  }

  /**
   * Restart the slideshow
   * @param {?int} [newIdx=null] optional idx to use for current idx
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
   */
  function _trackHistory(newIdx, selection) {
    const t = app.Screensaver.getTemplate();
    const idx = _VARS.history.idx;
    const len = _VARS.history.arr.length;
    if ((newIdx === null) && (idx === len - 1)) {
      // add newest photo
      const photoName = t.views[selection].getPhotoName();
      const photoIdx = photoName.match(/\d+/)[0];
      _VARS.history.arr.push({
        viewsIdx: selection,
        lastViewsIdx: _VARS.lastSelected,
        photosIdx: photoIdx,
      });
    }

    if (_VARS.history.arr.length > _VARS.history.max) {
      // limit history size
      _VARS.history.arr.shift();
      _VARS.history.idx--;
      _VARS.history.idx = Math.max(_VARS.history.idx, -1);
    }

    _VARS.history.idx++;
    if (_VARS.history.idx === _VARS.history.max) {
      // reset pointer to beginning
      _VARS.history.idx = 0;
    }
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

    if (!app.SSRunner.isStarted() || (newIdx === -1)) {
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
      const t = app.Screensaver.getTemplate();
      const transTime = Chrome.Storage.get('transitionTime');
      if (transTime) {
        app.SSRunner.setWaitTime(transTime.base * 1000);
      }
      _VARS.history.max = Math.min(t.photos.length, _VARS.history.max);

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
      if (_VARS.started) {
        if (_VARS.history.idx <= 0) {
          // at beginning
          return;
        }

        const t = app.Screensaver.getTemplate();
        let idx = _VARS.history.idx - 2;
        _VARS.history.idx = idx;
        let viewsIdx;
        if (idx >= 0) {
          const photosIdx = _VARS.history.arr[idx].photosIdx;
          app.SSFinder.setPhotosIndex(photosIdx);
          viewsIdx = _VARS.history.arr[idx].viewsIdx;
          _VARS.lastSelected = _VARS.history.arr[idx].lastViewsIdx;
          t.views[viewsIdx].setPhoto(t.photos[photosIdx]);
          t.views[viewsIdx].render();
        } else {
          _VARS.lastSelected = -1;
          viewsIdx = -1;
        }
        _step(viewsIdx);
      }
    },
  };
})();
