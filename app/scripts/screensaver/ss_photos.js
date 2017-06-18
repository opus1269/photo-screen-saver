/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Collection of {@link app.Photo} objects
 * @namespace
 */
app.SSPhotos = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * The array of photos
   * @type {Array<app.Photo>}
   * @const
   * @private
   * @memberOf app.SSPhotos
   */
  const _photos = [];

  /**
   * Current index into {@link _photos}
   * @type {int}
   * @private
   * @memberOf app.SSPhotos
   */
  let _curIdx = 0;

  /**
   * Flag to indicate if any photos are usable
   * @type {boolean}
   * @private
   * @memberOf app.SSPhotos
   */
  let _hasUsable = true;

  /**
   * Is the given {@link app.Photo} in one of the views
   * @param {app.Photo} photo - A photo
   * @returns {boolean} true if in t.views
   * @private
   * @memberOf app.SSPhotos
   */
  function _inViews(photo) {
    let ret = false;
    const views = app.Screensaver.getViews();
    for (const view of views) {
      if (view.photo.name === photo.name) {
        ret = true;
      }
    }
    return ret;
  }

  return {
    /**
     * Add the photos from an {@link app.PhotoSource.SourcePhotos}
     * @param {app.PhotoSource.SourcePhotos} source
     * - The {@link app.PhotoSource.SourcePhotos}
     * @memberOf app.SSPhotos
     */
    addFromSource: function(source) {
      const type = source.type;
      const viewType = app.Screensaver.getViewType();
      let ct = 0;
      for (const sourcePhoto of source.photos) {
        if (!app.Photo.ignore(sourcePhoto.asp, viewType)) {
          const photo = new app.Photo('photo' + ct, sourcePhoto, type);
          _photos.push(photo);
          ct++;
        }
      }
    },

    /**
     * Get number of photos
     * @returns {int} The number of photos
     * @memberOf app.SSPhotos
     */
    getCount: function() {
      return _photos.length;
    },

    /**
     * Do we have photos that aren't bad
     * @returns {boolean} true if at least one photo is good
     * @memberOf app.SSPhotos
     */
    hasUsable: function() {
      return _hasUsable;
    },

    /**
     * Is the photo at the given index not marked bad
     * @param {int} idx - The index
     * @returns {boolean} true if photo is good
     * @memberOf app.SSPhotos
     */
    isUsable: function(idx) {
      return _photos[idx].name !== 'skip';
    },

    /**
     * Get the {@link app.Photo} at the given index
     * @param {int} idx - The index
     * @returns {app.Photo} A {@link app.Photo}
     * @memberOf app.SSPhotos
     */
    get: function(idx) {
      return _photos[idx];
    },

    /**
     * Get the next {@link app.Photo} that is usable
     * @returns {?app.Photo} A {@link app.Photo}
     * @memberOf app.SSPhotos
     */
    getNextUsable: function() {
      // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
      for (let i = 0; i < _photos.length; i++) {
        // find a url that is ok, AFAWK
        const index = (i + _curIdx) % _photos.length;
        const photo = _photos[index];
        if (app.SSPhotos.isUsable(index) && !_inViews(photo)) {
          _curIdx = index;
          app.SSPhotos.incCurrentIndex();
          return photo;
        }
      }
      return null;
    },

    /**
     * Get current index into {@link _photos}
     * @returns {int} index
     * @memberOf app.SSPhotos
     */
    getCurrentIndex: function() {
      return _curIdx;
    },

    /**
     * Set current index into {@link _photos}
     * @param {int} idx - The index
     * @memberOf app.SSPhotos
     */
    setCurrentIndex: function(idx) {
      _curIdx = idx;
    },

    /**
     * Increment current index into {@link _photos}
     * @returns {int} new current index
     * @memberOf app.SSPhotos
     */
    incCurrentIndex: function() {
     return _curIdx = (_curIdx === _photos.length - 1) ? 0 : _curIdx + 1;
    },

    /**
     * Get the index of the {@link app.Photo} with the given name
     * @param {string} name - The name
     * @returns {int} The index, -1 if photo is bad
     * @memberOf app.SSPhotos
     */
    getIndexFromName: function(name) {
      if (name === 'skip') {
        return -1;
      }
      return parseInt(name.match(/\d+/)[0], 10);
    },

    // todo /**
    //  * Get an {@link Iterator} on the photos
    //  * @returns {Iterator.<app.SSPhotos>} Iterator
    //  * @memberOf app.SSPhotos
    //  */
    // getEntries: function() {
    //   return _photos.entries;
    // },

    /**
     * Mark an {@link app.Photo} as bad
     * @param {int} idx - The index
     * @memberOf app.SSPhotos
     */
    markBad: function(idx) {
      const photo = _photos[idx];
      photo.name = 'skip';
      _hasUsable = !_photos.every((photo) => {
        return photo.name === 'skip';
      });
      if (photo.type === 'Google') {
        // log bad chromecast links
        Chrome.GA.error(`${photo.path}`, 'SSPhotos.markBad');
      }
    },

    /**
     * Randomize the photos
     * @memberOf app.SSPhotos
     */
    shuffle: function() {
      Chrome.Utils.shuffleArray(_photos);
      // rename
      _photos.forEach((photo, index) => {
        photo.name = 'photo' + index;
      });
    },
  };
})();
