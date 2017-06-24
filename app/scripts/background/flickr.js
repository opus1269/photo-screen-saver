/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Interface to flickr API
 * @namespace
 */
app.Flickr = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Flickr rest API
   * @type {string}
   * @const
   * @default
   * @private
   * @memberOf app.Flickr
   */
  const _URL_BASE = 'https://api.flickr.com/services/rest/';

  /**
   * Flickr rest API authorization key
   * @type {string}
   * @const
   * @private
   * @memberOf app.Flickr
   */
  const _KEY = '1edd9926740f0e0d01d4ecd42de60ac6';

  /**
   * Max photos to return
   * @type {int}
   * @const
   * @default
   * @private
   * @memberOf app.Flickr
   */
  const _MAX_PHOTOS = 250;

  /**
   * Extract the photos into an Array
   * @param {JSON} response - server response
   * @returns {Promise<app.PhotoSource.SourcePhoto[]>} Array of photos
   * @private
   * @memberOf app.Flickr
   */
  function _processPhotos(response) {
    if (!response.photos || !response.photos.photo) {
      throw new Error(Chrome.Locale.localize('err_photo_source_title'));
    }

    /** @(type) {PhotoSource.SourcePhoto[]} */
    const photos = [];
    response.photos.photo.forEach((photo) => {
      let url = null;
      let width;
      let height;
      if (photo && (photo.media === 'photo') && (photo.isfriend !== '0') &&
          (photo.isfamily !== '0')) {
        url = photo.url_k || url;
        url = photo.url_o || url;
        if (url) {
          if (photo.url_o) {
            width = parseInt(photo.width_o, 10);
            height = parseInt(photo.height_o, 10);
          } else {
            width = parseInt(photo.width_k, 10);
            height = parseInt(photo.height_k, 10);
          }
          const asp = width / height;
          let pt = null;
          if (photo.latitude && photo.longitude) {
            pt = app.PhotoSource.createPoint(photo.latitude, photo.longitude);
          }
          app.PhotoSource.addPhoto(photos, url,
              photo.ownername, asp, photo.owner, pt);
        }
      }
    });
    return Promise.resolve(photos);
  }

  return {
    /**
     * Get my photo album
     * @returns {Promise<app.PhotoSource.SourcePhoto[]>} Array of photos
     * @memberOf app.Flickr
     */
    loadAuthorPhotos: function() {
      const userId = '86149994@N06';
      const url =
          `${_URL_BASE}?method=flickr.people.getPublicPhotos` +
          `&api_key=${_KEY}&user_id=${userId}` +
          `&extras=owner_name,url_o,media,geo&per_page=${_MAX_PHOTOS}` +
          '&format=json&nojsoncallback=1';
      return Chrome.Http.doGet(url).then((response) => {
        if (response.stat !== 'ok') {
          throw new Error(response.message);
        }
        return _processPhotos(response);
      });
    },

    /**
     * Retrieve flickr photos
     * @returns {Promise<app.PhotoSource.SourcePhoto[]>} Array of photos
     * @memberOf app.Flickr
     */
    loadPhotos: function() {
      const url =
          `${_URL_BASE}?method=flickr.interestingness.getList` +
          `&api_key=${_KEY}&extras=owner_name,url_k,media,geo` +
          `&per_page=${_MAX_PHOTOS}` +
          '&format=json&nojsoncallback=1';

      return Chrome.Http.doGet(url).then((response) => {
        if (response.stat !== 'ok') {
          throw new Error(response.message);
        }
        return _processPhotos(response);
      });
    },
  };
})();
