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
   * todo get rid of _VARS
   * Instance variables
   * @type {Object}
   * @property {int} transTime - slide transition time in milliSecs
   * @property {boolean} waitForLoad - if false, replace all current photos
   * @private
   * @memberOf app.SSFinder
   */
  const _VARS = {
    transTime: 30000,
    waitForLoad: true,
  };

  /**
   * Mark a photo in {@link app.SSPhotos} as unusable
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @private
   * @memberOf app.SSFinder
   */
  function _markPhotoBad(idx) {
    const views = app.Screensaver.getViews();
    views[idx].photo.markBad();
    if (!app.SSPhotos.hasUsable()) {
      // if all items are bad set no photos state
      app.Screensaver.setNoPhotos();
    }
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
    if (views[idx].isLoaded()) {
      console.log('found first time: photo', views[idx].photo.getId(), ' view', idx);
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
        console.log('found in loop: photo', view.photo.getId(), ' view', index);
        return index;
      } else if (view.isError()) {
        _markPhotoBad(index);
        if (!app.SSPhotos.hasUsable()) {
          // all photos bad
          app.Screensaver.setNoPhotos();
          return -1;
        }
        const photo = app.SSPhotos.getNextUsable();
        if (photo) {
          console.log('replacing in find: photo', photo.getId(), ' view', index);
          view.setPhoto(photo);
          // todo const photoId = photo.getId();
          // const photosIdx = app.SSPhotos.getCurrentIndex();
          // app.SSHistory.update(idx, photoId, photosIdx);
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
      console.log('Attempt to replace selected: view', idx);
      return;
    }

    const views = app.Screensaver.getViews();
    const photoLen = app.SSPhotos.getCount();
    if (photoLen <= views.length) {
      return;
    }

    const photo = app.SSPhotos.getNextUsable();
    if (photo) {
      console.log('replacing in replace: photo', photo.getId(), ' view', idx);
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
        _VARS.transTime = transTime.base * 1000;
      }
      _VARS.waitForLoad = true;
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
        app.SSRunner.setWaitTime(200);
      } else {
        // photo found, set the waitTime back to transition time
        app.SSRunner.setWaitTime(_VARS.transTime);
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
