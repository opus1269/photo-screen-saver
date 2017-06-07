/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Interface to the Chromecast photos
 * @namespace
 */
app.ChromeCast = (function() {
  'use strict';

  new ExceptionHandler();

  return {
    /**
     * Get the photos from chromecast.json
     * @returns {Promise<app.PhotoSource.SourcePhoto[]>} Array of photos
     * @memberOf app.ChromeCast
     */
    loadPhotos: function() {
      const url = '/assets/chromecast.json';
      return Chrome.Http.doGet(url).then((photos) => {
        photos = photos || [];
        photos.forEach((photo) => {
          photo.asp = 16 / 9;
        });
        return Promise.resolve(photos);
      });
    },
  };
})();
