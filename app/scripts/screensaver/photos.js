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
app.Photos = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * The array of photos
   * @type {Array<app.Photo>}
   * @private
   */
  const _photos = [];

  return {
    /**
     * Add a photo
     * @param {app.Photo} photo - The photo to add
     * @memberOf app.Photos
     */
    add: function(photo) {
      _photos.push(photo);
    },

   };
})();
