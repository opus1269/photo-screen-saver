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
      return !_photos.every((item) => {
        return item.name === 'skip';
      });
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
     * Get the index of the {@link app.Photo} with the given name
     * @param {string} name - The name
     * @returns {int} The index
     * @memberOf app.SSPhotos
     */
    getIndexFromName: function(name) {
      return parseInt(name.match(/\d+/)[0], 10);
    },

    /**
     * Get an {@link Iterator} on the photos
     * @returns {Iterator.<app.SSPhotos>} Iterator
     * @memberOf app.SSPhotos
     */
    getEntries: function() {
      return _photos.entries;
    },

    /**
     * Mark an {@link app.Photo} as bad
     * @param {int} idx - idx to mark bad
     * @memberOf app.SSPhotos
     */
    markBad: function(idx) {
      _photos[idx].name = 'skip';
    },
  };
})();
