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
   * @property {boolean} firstAni - true after first animation cycle
   * @property {int} lastSelected - last selected page
   * @property {int} replaceIdx - page whose photo is to be replaced
   * @property {int} previousIdx - previous page (may have failed to load)
   * @property {int} photosIdx - pointer into photos array
   * @property {int} transTime - slide transition time in milliSecs
   * @property {int} waitTime - wait time when looking for photo in milliSecs
   * @property {boolean} waitForLoad - if false, replace all current photos
   * @private
   * @memberOf app.SSRunner
   */
  const _VARS = {
    firstAni: false,
    lastSelected: -1,
    replaceIdx: -1,
    previousIdx: -1,
    photosIdx: 0,
    transTime: 30000,
    waitTime: 30000,
    waitForLoad: true,
  };

  /**
   * Mark a photo in [t.photos]{@link app.Screensaver.t} as unusable
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
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
        app.Screensaver.setNoPhotos();
      }
    }
  }

  /**
   * Try to find a photo that has finished loading
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @returns {int} index into t.views, -1 if none are loaded
   * @private
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
      if ((index === _VARS.lastSelected) || (index === t.p.selected)) {
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
   * @memberOf app.SSRunner
   */
  function _replacePhoto(idx, error) {
    const t = app.Screensaver.getTemplate();
    if (error) {
      // bad url, mark it
      _markPhotoBad(idx);
    }

    if (_VARS.firstAni && (t.photos.length > t.views.length)) {
      let item;
      for (let i = _VARS.photosIdx; i < t.photos.length; i++) {
        // find a url that is ok, AFAWK
        item = t.photos[i];
        if (item.name !== 'skip') {
          _VARS.photosIdx = i;
          break;
        }
      }
      // add the next image from the master list to this page
      t.views[idx].setPhoto(item);
      if (_VARS.photosIdx === t.photos.length - 1) {
        _VARS.photosIdx = 0;
      } else {
        _VARS.photosIdx += 1;
      }
    }
  }

  /**
   * Replace the active photos with new photos from the master array
   * @private
   * @memberOf app.SSRunner
   */
  function _replaceAllPhotos() {
    const t = app.Screensaver.getTemplate();
    if (t.photos.length > t.views.length) {
      let pos = 0;
      let newIdx = _VARS.photosIdx;
      for (let i = _VARS.photosIdx; i < t.photos.length; i++) {
        newIdx = i;
        const item = t.photos[i];
        if (item.name !== 'skip') {
          if ((pos === _VARS.lastSelected) ||
              (pos === t.p.selected)) {
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
      _VARS.photosIdx = (newIdx === t.photos.length - 1) ? 0 : newIdx + 1;
    }
  }

  /**
   * Get the next photo to display
   * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
   * @returns {int} next - index into [t.views]{@link app.Screensaver.t}
   * to display, -1 if none are ready
   * @private
   * @memberOf app.SSRunner
   */
  function _getNextPhoto(idx) {
    const t = app.Screensaver.getTemplate();
    let ret = _findLoadedPhoto(idx);
    if (ret === -1) {
      if (_VARS.waitForLoad) {
        // no photos ready.. wait a little and try again the first time
        _VARS.waitTime = 2000;
        _VARS.waitForLoad = false;
      } else {
        // tried waiting for load, now replace the current photos
        _VARS.waitTime = 200;
        _replaceAllPhotos();
        idx = (idx === t.views.length - 1) ? 0 : idx + 1;
        ret = _findLoadedPhoto(idx);
        if (ret !== -1) {
          _VARS.waitForLoad = true;
        }
      }
    } else if (_VARS.waitTime !== _VARS.transTime) {
      // photo found, set the waitTime back to transition time
      _VARS.waitTime = _VARS.transTime;
    }
    return ret;
  }

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

    const curPage = !t.started ? 0 : t.p.selected;
    const prevPage = (curPage > 0) ? curPage - 1 : t.views.length - 1;
    let nextPage = (curPage === t.views.length - 1) ? 0 : curPage + 1;

    // for replacing the page in _onAniFinished
    _VARS.replaceIdx = _VARS.lastSelected;
    _VARS.previousIdx = prevPage;

    if (!t.started) {
      // special case for first page. neon-animated-pages is configured
      // to run the entry animation for the first selection
      nextPage = curPage;
    } else if (!_VARS.firstAni) {
      // special case for first full animation. next time ready to start
      // splicing in the new images
      _VARS.firstAni = true;
    }

    nextPage = _getNextPhoto(nextPage);
    if (nextPage !== -1) {
      // update t.p.selected so the animation runs
      _VARS.lastSelected = t.p.selected;
      t.p.selected = nextPage;
      t.started = true;

      // setup photo
      app.SSTime.setTime();
      t.views[nextPage].render();
    }

    // set the next timeout, then call ourselves - runs unless interrupted
    window.setTimeout(() => {
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
      _VARS.transTime = transTime.base * 1000;
      _VARS.waitTime = _VARS.transTime;
      _VARS.waitForLoad = true;

      // slight delay at beginning so we have a smooth start
      window.setTimeout(_runShow, 2000);
    },

    /**
     * Set the index into [t.photos]{@link app.Screensaver.t}
     * @param {int} idx - array index
     * @memberOf app.SSRunner
     */
    setPhotosIndex: function(idx) {
      _VARS.photosIdx = idx;
    },

    /**
     * Add the next photo from the master array
     * @memberOf app.SSRunner
     */
    replacePhoto: function() {
      const t = app.Screensaver.getTemplate();
      if (_VARS.replaceIdx >= 0) {
        _replacePhoto(_VARS.replaceIdx, false);
      }

      const prevPage = _VARS.previousIdx;
      if ((prevPage >= 0) && t.views[prevPage].isError()) {
        // broken link, mark it and replace it
        _replacePhoto(prevPage, true);
      }
    },
  };
})();
