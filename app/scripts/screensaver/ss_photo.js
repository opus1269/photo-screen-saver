/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
  window.app = window.app || {};

  'use strict';

  new ExceptionHandler();

  /**
   * A photo for the screen saver
   *
   * @property {string} name - Unique name
   * @property {string} _url - The url to the photo
   * @property {string} _photographer - The photographer
   * @property {string} _type - type of {@link app.PhotoSource}
   * @property {number} _aspectRatio - aspect ratio
   * @property {Object} _ex - additional information about the photo
   * @property {string} _point - geolocation 'lat lon'
   * @alias app.SSPhoto
   */
  app.SSPhoto = class SSPhoto {

    /**
     * Create a new photo
     * @param {string} name - unique name
     * @param {app.PhotoSource.SourcePhoto} source - source photo
     * @param {string} sourceType - type of {@link app.PhotoSource}
     * @constructor
     */
    constructor(name, source, sourceType) {
      this.name = name;
      this._url = source.url;
      this._photographer = source.author ? source.author : '';
      this._type = sourceType;
      this._aspectRatio = source.asp;
      this._ex = source.ex;
      this._point = source.point;
    }

    /**
     * Get photo url
     * @returns {string} url
     */
    getUrl() {
      return this._url;
    }

    /**
     * Get photo source type
     * @returns {string} type
     */
    getType() {
      return this._type;
    }

    /**
     * Get photographer
     * @returns {string} photographer
     */
    getPhotographer() {
      return this._photographer;
    }

    /**
     * Get photo aspect ratio
     * @returns {number} aspect ratio
     */
    getAspectRatio() {
      return this._aspectRatio;
    }

    /**
     * Get geo location point
     * @returns {?string} point
     */
    getPoint() {
      return this._point;
    }

    /**
     * Create a new tab with a link to the
     * original source of the photo, if possible
     */
    showSource() {
      let regex;
      let id;
      let url = null;

      switch (this._type) {
        case '500':
          // parse photo id
          regex = /(\/[^\/]*){4}/;
          id = this._url.match(regex);
          url = `http://500px.com/photo${id[1]}`;
          break;
        case 'flickr':
          if (this._ex) {
            // parse photo id
            regex = /(\/[^\/]*){4}(_.*_)/;
            id = this._url.match(regex);
            url = `https://www.flickr.com/photos/${this._ex}${id[1]}`;
          }
          break;
        case 'reddit':
          if (this._ex) {
            url = this._ex;
          }
          break;
        default:
          break;
      }
      if (url !== null) {
        chrome.tabs.create({url: url});
      }
    }
  };
})();
