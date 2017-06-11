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
   * @private
   * @memberOf app.SSRunner
   */
  const _VARS = {
    started: false,
    lastSelected: -1,
    waitTime: 30000,
    paused: false,
    timeOutId: 0,
  };

  /**
   * Called at fixed time intervals to cycle through the photos
   * Potentially runs forever
   * @private
   * @memberOf app.SSRunner
   */
  function _runShow() {
    const t = app.Screensaver.getTemplate();
    if (t.noPhotos) {
      // no usable photos to show
      return;
    }

    const curIdx = !app.SSRunner.isStarted() ? 0 : t.p.selected;
    const prevIdx = (curIdx > 0) ? curIdx - 1 : t.views.length - 1;
    let nextIdx = (curIdx === t.views.length - 1) ? 0 : curIdx + 1;

    if (!app.SSRunner.isStarted()) {
      // special case for first page. neon-animated-pages is configured
      // to run the entry animation for the first selection
      nextIdx = curIdx;
    }

    nextIdx = app.SSFinder.getNext(nextIdx, _VARS.lastSelected, prevIdx);
    if (nextIdx !== -1) {
      // the next photo is ready

      if (!app.SSRunner.isStarted()) {
        _VARS.started = true;
        app.SSTime.setTime();
      }

      // update t.p.selected so the animation runs
      _VARS.lastSelected = t.p.selected;
      t.p.selected = nextIdx;

      // setup photo
      t.views[nextIdx].render();
    }

    // set the next timeout, then call ourselves - runs unless interrupted
    _VARS.timeOutId = window.setTimeout(() => {
      _runShow();
    }, _VARS.waitTime);
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
      // slight delay at beginning so we have a smooth start
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
        let label = '';
        _VARS.paused = !_VARS.paused;
        if (_VARS.paused) {
          window.clearTimeout(_VARS.timeOutId);
          label = Chrome.Locale.localize('paused');
          app.Screensaver.setPausedLabel(label);
        } else {
          app.Screensaver.setPausedLabel(label);
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
        if (app.SSRunner.isPaused()) {
          app.SSRunner.togglePaused();
          app.SSRunner.togglePaused();
        } else {
          window.clearTimeout(_VARS.timeOutId);
          _restart();
        }
      }
    },

    /**
     * Backup one slide
     * @memberOf app.SSRunner
     */
    back: function() {
      if (_VARS.started) {
        const t = app.Screensaver.getTemplate();
        _VARS.historyIdx = Math.max(_VARS.historyIdx - 2, 0);
        const viewIdx = _VARS.history[_VARS.historyIdx].viewIdx;
        const photoName = _VARS.history[_VARS.historyIdx + 1].name;
        const photoIdx = photoName.match(/\d+/)[0];
        app.SSFinder.setPhotosIndex(photoIdx);
        // _VARS.lastSelected = _VARS.lastLastSelected;
        if (app.SSRunner.isPaused()) {
          app.SSRunner.togglePaused(viewIdx);
          app.SSRunner.togglePaused();
        } else {
          window.clearTimeout(_VARS.timeOutId);
          _restart(viewIdx);
        }
      }
    },
  };
})();
