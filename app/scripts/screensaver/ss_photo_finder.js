/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Find a photo that is ready for slideshow
 * @namespace
 */
app.SSFinder = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Transition time in milliseconds
   * @type {int}
   * @private
   * @memberOf app.SSFinder
   */
  let _transTime = 30000;

  /**
   * Do all views have bad photos
   * @returns {boolean} true if all bad
   * @private
   * @memberOf app.SSFinder
   */
  function _allViewsBad() {
    let ret = true;
    const views = app.Screensaver.getViews();
    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      if (app.SSRunner.isCurrentPair(i)) {
        // don't check current animation pair
        continue;
      }
      if (!view.photo.isBad()) {
        ret = false;
        break;
      }
    }
    return ret;
  }

  /**
   * Replace all views
   * @private
   * @memberOf app.SSFinder
   */
  function _replaceAll() {
    const views = app.Screensaver.getViews();
    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      const photo = app.SSPhotos.getNextUsable();
      if (app.SSRunner.isCurrentPair(i)) {
        // don't replace current animation pair
        continue;
      }
      view.setPhoto(photo);
    }
    app.SSHistory.clear();
  }

  /**
   * Try to find a photo that has finished loading
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @returns {int} index into t.views, -1 if none are loaded
   * @private
   * @memberOf app.SSFinder
   */
  function _findLoadedPhoto(idx) {
    const views = app.Screensaver.getViews();
    if (_allViewsBad()) {
      // replace the photos
      _replaceAll();
    }
    if (views[idx].isLoaded()) {
      return idx;
    }
    // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
    for (let i = 0; i < views.length; i++) {
      const index = (i + idx) % views.length;
      const view = views[index];
      if (app.SSRunner.isCurrentPair(index)) {
        // don't use current animation pair
        continue;
      }
      if (view.isLoaded()) {
        return index;
      } else if (view.isError() && !view.photo.isBad()) {
        view.photo.markBad();
        if (!app.SSPhotos.hasUsable()) {
          // all photos bad
          app.Screensaver.setNoPhotos();
          return -1;
        }
      }
    }
    return -1;
  }

  /**
   * Add the next photo from the master array
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @private
   * @memberOf app.SSFinder
   */
  function _replacePhoto(idx) {
    if (app.Screensaver.isSelected(idx)) {
      return;
    }

    const views = app.Screensaver.getViews();
    const photoLen = app.SSPhotos.getCount();
    if (photoLen <= views.length) {
      return;
    }

    const photo = app.SSPhotos.getNextUsable();
    if (photo) {
      views[idx].setPhoto(photo);
    }
  }

  return {
    /**
     * Initialize the photo finder
     * @memberOf app.SSFinder
     */
    initialize: function() {
      const transTime = Chrome.Storage.get('transitionTime');
      if (transTime) {
        _transTime = transTime.base * 1000;
      }
    },

    /**
     * Get the next photo to display
     * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
     * @returns {int} next - index into [t.views]{@link app.Screensaver.t}
     * to display, -1 if none are ready
     * @memberOf app.SSFinder
     */
    getNext: function(idx) {
      let ret = _findLoadedPhoto(idx);
      if (ret === -1) {
        // no photos ready, wait a little, try again
        app.SSRunner.setWaitTime(500);
      } else {
        // photo found, set the waitTime back to transition time
        app.SSRunner.setWaitTime(_transTime);
      }
      return ret;
    },

    /**
     * Add the next photo from the master array
     * @param {int} idx - t.views index to replace
     * @memberOf app.SSFinder
     */
    replacePhoto: function(idx) {
      if (idx >= 0) {
        _replacePhoto(idx);
      }
    },
  };
})();
