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
   * @property {int} photosIdx - pointer into
   *     [t.photos]{@link app.Screensaver.t} array
   * @property {int} replaceIdx - page whose photo is to be replaced
   * @property {int} previousIdx - previous page (may have failed to load)
   * @property {int} transTime - slide transition time in milliSecs
   * @property {boolean} waitForLoad - if false, replace all current photos
   * @private
   * @memberOf app.SSFinder
   */
  const _VARS = {
    photosIdx: 0,
    replaceIdx: 0,
    previousIdx: 0,
    transTime: 30000,
    waitForLoad: true,
  };

  /**
   * Mark a photo in [t.photos]{@link app.Screensaver.t} as unusable
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @private
   * @memberOf app.SSFinder
   */
  function _markPhotoBad(idx) {
    const views = app.Screensaver.getViews();
    const photos = app.Screensaver.getPhotos();
    const name = views[idx].getPhotoName();
    const index = photos.findIndex((item) => {
      return item.name === name;
    });
    if (index !== -1) {
      photos[index].name = 'skip';
      const skipAll = photos.every((item) => {
        return item.name === 'skip';
      });
      if (skipAll) {
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
      } else if (view.isError()) {
        _markPhotoBad(index);
      }
    }
    return -1;
  }

  /**
   * Add the next photo from the master array
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @param {boolean} error - true if the photo at idx didn't load
   * @private
   * @memberOf app.SSFinder
   */
  function _replacePhoto(idx, error) {
    if (error) {
      // bad url, mark it
      _markPhotoBad(idx);
    }

    const views = app.Screensaver.getViews();
    const photos = app.Screensaver.getPhotos();
    if (views.length <= photos.length) {
      return;
    }
    let item = null;
    // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
    for (let i = 0; i < photos.length; i++) {
      const index = (i + _VARS.photosIdx) % photos.length;
      // find a url that is ok, AFAWK
      item = photos[index];
      if (item.name !== 'skip') {
        _VARS.photosIdx = index;
        break;
      }
    }

    if (item && !app.SSRunner.isCurrentPair(idx)) {
      // add the next image from the master list to this page
      views[idx].setPhoto(item);
      if (_VARS.photosIdx === photos.length - 1) {
        _VARS.photosIdx = 0;
      } else {
        _VARS.photosIdx += 1;
      }
    }
    if (!item) {
      // all photos bad
      app.Screensaver.setNoPhotos();
    }
  }

  /**
   * Replace the active photos with new photos from the master array
   * @private
   * @memberOf app.SSFinder
   */
  function _replaceAllPhotos() {
    const views = app.Screensaver.getViews();
    const photos = app.Screensaver.getPhotos();
    if (views.length <= photos.length) {
      return;
    }
    app.SSRunner.clearHistory();
    let pos = 0;
    let newIdx = _VARS.photosIdx;
    // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
    for (let i = 0; i < photos.length; i++) {
      const index = (i + _VARS.photosIdx) % photos.length;
      newIdx = index;
      const item = photos[index];
      if (item.name !== 'skip') {
        if (app.SSRunner.isCurrentPair(pos)) {
          // don't replace current animation pair
          pos++;
          continue;
        }
        // replace photo
        if (pos < views.length) {
          views[pos].setPhoto(item);
        }
        pos++;
        if (pos >= views.length) {
          break;
        }
      }
    }
    _VARS.photosIdx = (newIdx === photos.length - 1) ? 0 : newIdx + 1;
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
     * @param {int} previousIdx - last index checked for loading
     * @returns {int} next - index into [t.views]{@link app.Screensaver.t}
     * to display, -1 if none are ready
     * @memberOf app.SSFinder
     */
    getNext: function(idx, lastSelected, previousIdx) {
      _VARS.replaceIdx = lastSelected;
      _VARS.previousIdx = previousIdx;
      let ret = _findLoadedPhoto(idx);
      if (ret === -1) {
        if (_VARS.waitForLoad) {
          // no photos ready.. wait a little and try again the first time
          app.SSRunner.setWaitTime(2000);
          _VARS.waitForLoad = false;
        } else {
          // tried waiting for load, now replace the current photos
          app.SSRunner.setWaitTime(200);
          _replaceAllPhotos();
          const views = app.Screensaver.getViews();
          idx = (idx === views.length - 1) ? 0 : idx + 1;
          ret = _findLoadedPhoto(idx);
          if (ret !== -1) {
            _VARS.waitForLoad = true;
          }
        }
      } else if (app.SSRunner.getWaitTime() !== _VARS.transTime) {
        // photo found, set the waitTime back to transition time
        app.SSRunner.setWaitTime(_VARS.transTime);
      }
      return ret;
    },

    /**
     * Get the number of photos
     * @returns {int} photo count
     * @memberOf app.SSFinder
     */
    getPhotosCount: function() {
      const photos = app.Screensaver.getPhotos();
      return photos.length;
    },

    /**
     * Get the index into [t.photos]{@link app.Screensaver.t}
     * @returns {int} idx - array index
     * @memberOf app.SSFinder
     */
    getPhotosIndex: function() {
      return _VARS.photosIdx;
    },

    /**
     * Set the index into [t.photos]{@link app.Screensaver.t}
     * @param {int} idx - array index
     * @memberOf app.SSFinder
     */
    setPhotosIndex: function(idx) {
      _VARS.photosIdx = idx;
    },

    /**
     * Add the next photo from the master array
     * @memberOf app.SSFinder
     */
    replacePhoto: function() {
      if (_VARS.replaceIdx >= 0) {
        _replacePhoto(_VARS.replaceIdx, false);
      }

      const views = app.Screensaver.getViews();
      const prevPage = _VARS.previousIdx;
      if ((prevPage >= 0) && views[prevPage].isError()) {
        // broken link, mark it and replace it
        _replacePhoto(prevPage, true);
      }
    },
  };
})();
