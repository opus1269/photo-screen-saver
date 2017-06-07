/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Utility methods
 * @namespace
 */
app.Utils = (function() {
  'use strict';

  new ExceptionHandler();

  return {
    /**
     * Determine if a String is null or whitespace only
     * @param {?string} str - string to check
     * @returns {boolean} true is str is whitespace (or null)
     * @memberOf app.Utils
     */
    isWhiteSpace: function(str) {
      return (!str || str.length === 0 || /^\s*$/.test(str));
    },

    /**
     * true if we are MS windows
     * @returns {boolean} true if MS windows
     * @memberOf app.Utils
     */
    isWin: function() {
      return Chrome.Storage.get('os') === 'win';
    },

    /**
     * Returns a random integer between min and max inclusive
     * @param {int} min - min value
     * @param {int} max - max value
     * @returns {int} random int
     * @memberOf app.Utils
     */
    getRandomInt: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Randomly sort an Array in place
     * Fisher-Yates shuffle algorithm.
     * @param {Array} array - Array to sort
     * @memberOf app.Utils
     */
    shuffleArray: function(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
    },
  };
})();
