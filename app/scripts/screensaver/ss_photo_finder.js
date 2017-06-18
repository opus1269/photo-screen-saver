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
   * Instance variables
   * @type {Object}
   * @property {int} replaceIdx - page whose photo is to be replaced
   * @property {int} transTime - slide transition time in milliSecs
   * @property {boolean} waitForLoad - if false, replace all current photos
   * @private
   * @memberOf app.SSFinder
   */
  const _VARS = {
    replaceIdx: -1,
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
    const name = views[idx].getPhotoName();
    const index = app.SSPhotos.getIndexFromName(name);
    if (index !== -1) {
      app.SSPhotos.markBad(index);
      if (!app.SSPhotos.hasUsable()) {
        // if all items are bad set no photos state
        app.Screensaver.setNoPhotos();
      }
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
      console.log(views[idx].photo.name);
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
        console.log('found in loop ', view.photo.name);
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
          console.log('replacing in find: ', photo.name);
          view.setPhoto(photo);
          // todo const photoId = app.SSPhotos.getIndexFromName(photo.name);
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
    if (app.SSRunner.isCurrentPair(idx)) {
      console.log('Attempt to replace member of current pair');
      return;
    }

    const views = app.Screensaver.getViews();
    const photoLen = app.SSPhotos.getCount();
    if (photoLen <= views.length) {
      return;
    }

    const photo = app.SSPhotos.getNextUsable();
    if (photo) {
      console.log('replacing in replace: ', photo.name);
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
     * @param {int} lastSelected - last selected index
     * @returns {int} next - index into [t.views]{@link app.Screensaver.t}
     * to display, -1 if none are ready
     * @memberOf app.SSFinder
     */
    getNext: function(idx, lastSelected) {
      _VARS.replaceIdx = lastSelected;
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
     * @memberOf app.SSFinder
     */
    replacePhoto: function() {
      if (_VARS.replaceIdx >= 0) {
        _replacePhoto(_VARS.replaceIdx);
      }
    },
  };
})();
