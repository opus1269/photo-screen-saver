/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

app.PhotoSources = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Enum for {@link app.PhotoSource} useKey
   * @typedef {enum} app.PhotoSources.UseKey
   * @readonly
   * @enum {int}
   * @memberOf app.PhotoSources
   */
  const UseKey = {
    GOOGLE: 'useGoogle',
    CHROMECAST: 'useChromecast',
    ED_500: 'useEditors500px',
    POP_500: 'usePopular500px',
    YEST_500: 'useYesterday500px',
    SPACE_RED: 'useSpaceReddit',
    EARTH_RED: 'useEarthReddit',
    ANIMAL_RED: 'useAnimalReddit',
    INT_FLICKR: 'useInterestingFlickr',
    AUTHOR: 'useAuthors',
  };

  /**
   * The array of photo sources
   * @type {Array<app.PhotoSource>}
   * @const
   * @private
   * @memberOf app.PhotoSources
   */
  const _sources = [];

  /**
   * Get the selected sources from local storage
   * @private
   * @memberOf app.PhotoSources
   */
  function _getSelectedSources() {
    for (const key in UseKey) {
      if (UseKey.hasOwnProperty(key)) {
        const useKey = UseKey[key];
        if (Chrome.Storage.getBool(useKey)) {
          const source = app.PhotoSource.createSource(useKey);
          if (source) {
            _sources.push(source);
          }
        }
      }
    }
  }

  return {
    UseKey: UseKey,

    /**
     * Get all the useage keys
     * @returns {string[]} Array of useage keys
     * @memberOf app.PhotoSources
     */
    getUseKeys: function() {
      let ret = [];
      for (const key in UseKey) {
        if (UseKey.hasOwnProperty(key)) {
          ret = ret.concat(UseKey[key]);
        }
      }
      return ret;
    },

    /**
     * Determine if a given string is a photo source
     * @param {string} useKey - String to check
     * @returns {boolean} true if photo source
     * @memberOf app.PhotoSources
     */
    isUseKey: function(useKey) {
      let ret = false;
      for (const key in UseKey) {
        if (UseKey.hasOwnProperty(key)) {
          if (UseKey[key] === useKey) {
            ret = true;
            break;
          }
        }
      }
      return ret;
    },

    /**
     * Process the given photo source and save to localStorage.
     * This normally requires a https call and may fail for various reasons
     * @param {string} useKey - The photo source to retrieve
     * @returns {Promise<void>} void
     * @memberOf app.PhotoSources
     */
    process: function(useKey) {
      const source = app.PhotoSource.createSource(useKey);
      if (source) {
        return source.process();
      } else {
        throw new Error('Unknown Photo Source');
      }
    },

    /**
     * Get all the photos from all selected sources. These will be
     * used by the screensaver.
     * @returns {app.PhotoSource.SourcePhotos[]} Array of sources photos
     * @memberOf app.PhotoSources
     */
    getSelectedPhotos: function() {
      _getSelectedSources();
      let ret = [];
      for (const source of _sources) {
        ret.push(source.getPhotos());
      }
      return ret;
    },

    /**
     * Process all the selected photo sources.
     * This normally requires a https call and may fail for various reasons
     * @memberOf app.PhotoSources
     */
    processAll: function() {
      _getSelectedSources();
      for (const source of _sources) {
        source.process().catch(() => {});
      }
    },

    /**
     * Process all the selected photo sources that are to be
     * updated every day.
     * This normally requires a https call and may fail for various reasons
     * @memberOf app.PhotoSources
     */
    processDaily: function() {
      _getSelectedSources();
      for (const source of _sources) {
        if (source.isDaily()) {
          source.process().catch(() => {});
        }
      }
    },
  };
})();
