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
   * @property {int} previousIdx - previous page (may have failed to load)
   * @property {int} transTime - slide transition time in milliSecs
   * @property {boolean} waitForLoad - if false, replace all current photos
   * @private
   * @memberOf app.SSFinder
   */
  const _VARS = {
    replaceIdx: -1,
    previousIdx: -1,
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
        const photo = app.SSPhotos.getNextUsable();
        if (photo) {
          console.log('replacing in find: ', photo.name);
          view.setPhoto(photo);
          // todo const photoId = app.SSPhotos.getIndexFromName(photo.name);
          // const photosIdx = app.SSPhotos.getCurrentIndex();
          // app.SSRunner.updateHistory(idx, photoId, photosIdx);
        }
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
    if (!app.SSPhotos.hasUsable()) {
      // all photos bad
      app.Screensaver.setNoPhotos();
      return;
    }
    if (app.SSRunner.isCurrentPair(idx)) {
      Chrome.GA.error('Attempt to replace member of current pair',
          'SSFinder._replacePhoto');
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

  /**
   * Replace the active photos with new photos from the master array
   * @private
   * @memberOf app.SSFinder
   */
  function _replaceAllPhotos() {
    if (!app.SSPhotos.hasUsable()) {
      // all photos bad
      app.Screensaver.setNoPhotos();
      return;
    }
    const views = app.Screensaver.getViews();
    const photoLen = app.SSPhotos.getCount();
    if (photoLen <= views.length) {
      return;
    }

    app.SSRunner.clearHistory();

    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      if (app.SSRunner.isCurrentPair(i)) {
        // don't replace current animation pair
        continue;
      }
      let photosIdx = app.SSPhotos.getCurrentIndex();
      // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
      for (let j = 0; j < photoLen; j++) {
        const index = (j + photosIdx) % photoLen;
        if (app.SSPhotos.isUsable(index)) {
          // replace photo
          const photo = app.SSPhotos.get(index);
          view.setPhoto(photo);
          app.SSPhotos.setCurrentIndex(index);
          app.SSPhotos.incCurrentIndex();
          break;
        }
      }
    }

    // let pos = 0;
      // const photosIdx = app.SSPhotos.getCurrentIndex();
      // let newIdx = photosIdx;
      // // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
      // for (let i = 0; i < photoLen; i++) {
      //   const index = (i + photosIdx) % photoLen;
      //   newIdx = index;
      //   if (app.SSPhotos.isUsable(index)) {
      //     const photo = app.SSPhotos.get(index);
      //     if (app.SSRunner.isCurrentPair(pos)) {
      //       // don't replace current animation pair
      //       pos++;
      //       continue;
      //     }
      //     // replace photo
      //     if (pos < views.length) {
      //       views[pos].setPhoto(photo);
      //       app.SSPhotos.setCurrentIndex(newIdx);
      //       pos++;
      //     }
      //     if (pos >= views.length) {
      //       break;
      //     }
      //   }
      // }
      // app.SSPhotos.incCurrentIndex();
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
          // no photos ready
          app.SSRunner.setWaitTime(200);
        } else {
          // photo found, set the waitTime back to transition time
          app.SSRunner.setWaitTime(_VARS.transTime);
        }
        // if (ret === -1) {
        //   // no photos ready
        //   if (_VARS.waitForLoad) {
        //     // wait a little and try again the first time
        //     app.SSRunner.setWaitTime(2000);
        //     _VARS.waitForLoad = false;
        //   } else {
        //     // tried waiting for load, now replace the current photos
        //     // and see if one is loaded
        //     app.SSRunner.setWaitTime(200);
        //     _replaceAllPhotos();
        //     // todo const views = app.Screensaver.getViews();
        //     // todo idx = (idx === views.length - 1) ? 0 : idx + 1;
        //     ret = _findLoadedPhoto(idx);
        //     if (ret !== -1) {
        //       // no photos ready.. reset so they have some time to load
        //       _VARS.waitForLoad = true;
        //     }
        //   }
        // } else {
        //   // photo found, set the waitTime back to transition time
        //   app.SSRunner.setWaitTime(_VARS.transTime);
        // }
        return ret;
      },

      /**
       * Add the next photo from the master array
       * @memberOf app.SSFinder
       */
      replacePhoto: function() {
        // todo const views = app.Screensaver.getViews();
        // const prevPage = _VARS.previousIdx;
        // if ((prevPage >= 0) && views[prevPage].isError()) {
        //   // broken link, mark it bad and replace
        //   _replacePhoto(prevPage, true);
        // }
        if (_VARS.replaceIdx >= 0) {
          _replacePhoto(_VARS.replaceIdx, false);
        }

      },
    };
  }

  )();
