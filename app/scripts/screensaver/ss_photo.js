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
   * aspect ratio of screen
   * @type {number}
   * @const
   * @private
   * @memberOf app.SSPhoto
   */
  const _SCREEN_ASP = screen.width / screen.height;

  /**
   * A photo for the screen saver
   *
   * @property {string} name - Unique name
   * @property {string} path - The url to the photo
   * @property {string} author - The photographer
   * @property {string} type - type of {@link app.PhotoSource}
   * @property {int} width - width
   * @property {int} height - height
   * @property {number} aspectRatio - aspect ratio
   * @property {Object} ex - additional information about the photo
   * @property {string} point - geolocation 'lat lon'
   * @property {string} label - author label
   * @property {?string} location - geolocation label
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
      this.path = source.url;
      this.author = source.author ? source.author : '';
      this.type = sourceType;
      this.aspectRatio = source.asp;
      this.ex = source.ex;
      this.point = source.point;
      this.width = screen.width;
      this.height = screen.height;
      this.location = null;

      this.setAuthorLabel(false);
    }

    /**
     * Determine if a photo would look bad zoomed or stretched on the screen
     * @param {number} asp - an aspect ratio
     * @returns {boolean} true if a photo aspect ratio differs substantially
     * from the screens'
     * @private
     */
    static _isBadAspect(asp) {
      // arbitrary
      const CUT_OFF = 0.5;
      return (asp < _SCREEN_ASP - CUT_OFF) || (asp > _SCREEN_ASP + CUT_OFF);
    }

    /**
     * Determine if a photo should not be displayed
     * @param {number} asp - an aspect ratio
     * @param {int} photoSizing - the sizing type
     * @returns {boolean} true if the photo should not be displayed
     */
    static ignore(asp, photoSizing) {
      let ret = false;
      const skip = Chrome.Storage.getBool('skip');

      if ((!asp || isNaN(asp)) ||
          (skip && ((photoSizing === 1) || (photoSizing === 3)) &&
          app.SSPhoto._isBadAspect(asp))) {
        // ignore photos that don't have aspect ratio
        // or would look bad with cropped or stretched sizing options
        ret = true;
      }
      return ret;
    }

    /**
     * Set the author label
     * @param {boolean} force - require display of label if true
     */
    setAuthorLabel(force) {
      this.label = '';
      let newType = this.type;
      const idx = this.type.search('User');

      if (!force && !Chrome.Storage.getBool('showPhotog') && (idx !== -1)) {
        // don't show label for user's own photos, if requested
        return;
      }

      if (idx !== -1) {
        // strip off 'User'
        newType = this.type.substring(0, idx - 1);
      }

      if (this.author) {
        this.label = `${this.author} / ${newType}`;
      } else {
        // no photographer name
        this.label = `${Chrome.Locale.localize('photo_from')} ${newType}`;
      }
    }

    /**
     * Create a new tab with a link to the
     * original source of the photo, if possible
     */
    showSource() {
      let regex;
      let id;
      let url = null;

      switch (this.type) {
        case '500':
          // parse photo id
          regex = /(\/[^\/]*){4}/;
          id = this.path.match(regex);
          url = `http://500px.com/photo${id[1]}`;
          break;
        case 'flickr':
          if (this.ex) {
            // parse photo id
            regex = /(\/[^\/]*){4}(_.*_)/;
            id = this.path.match(regex);
            url = `https://www.flickr.com/photos/${this.ex}${id[1]}`;
          }
          break;
        case 'reddit':
          if (this.ex) {
            url = this.ex;
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
