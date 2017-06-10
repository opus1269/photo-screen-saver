/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * A screensaver
 * @namespace
 */
app.Screensaver = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Main auto-binding template
   * @typedef {Element} app.Screensaver.Template
   * @property {?Element} rep - repeat template
   * @property {?Element} p - animated-pages
   * @property {Array<app.Photo>} photos - array of photos
   * @property {Array<app.SSView>} views - array of views
   * @property {int} sizingType - the way the photos are rendered
   * @property {int} aniType - the animation type for photo transitions
   * @property {boolean} noPhotos - true if there are no usable photos
   * @property {string} noPhotosLabel - label when no photos are useable
   * @property {string} timeLabel - current time label
   * @property {string} pausedLabel - slideshow paused label
   * @property {Function} _OnAniFinished - event, slide animation finished
   * @memberOf app.Screensaver
   */

  /**
   * Main auto-binding template
   * @type {app.Screensaver.Template}
   * @const
   * @private
   * @memberOf app.Screensaver
   */
  const t = document.querySelector('#t');
  t.rep = null;
  t.p = null;
  t.photos = [];
  t.views = [];
  t.sizingType = 0;
  t.aniType = 0;
  t.noPhotos = false;
  t.noPhotosLabel = '';
  t.timeLabel = '';
  t.pausedLabel = '';

  /**
   * Event: Template Bound, bindings have resolved and content has been
   * stamped to the page
   * @private
   * @memberOf app.Screensaver
   */
  function _onDomChange() {
    // set selected background image
    document.body.style.background = Chrome.Storage.get('background').
        substring(11);

    Chrome.GA.page('/screensaver.html');

    // register event listeners
    app.SSEvents.initialize();

    t.rep = t.$.repeatTemplate;
    t.p = t.$.pages;

    const hasPhotos = app.SSBuilder.build();
    if (hasPhotos) {
      // kick off the slide show if there are photos selected
      app.SSRunner.start();
    }
  }

  /**
   * Event: Slide animation finished
   * @memberOf app.Screensaver
   */
  t._OnAniFinished = function() {
    // replace the previous selected with the next one from master array
    // do it here so the web request doesn't run during the animation
    app.SSFinder.replacePhoto();
  };

  // listen for dom-change
  t.addEventListener('dom-change', _onDomChange);

  return {
    /**
     * Get reference to the auto-binding template
     * @returns {app.Screensaver.Template} The auto-binding template
     * @memberOf app.Screensaver
     */
    getTemplate: function() {
      return t;
    },

    /**
     * Set the state when no photos are available
     * @memberOf app.Screensaver
     */
    setNoPhotos: function() {
      const t = app.Screensaver.getTemplate();
      t.set('noPhotos', true);
      t.noPhotosLabel = Chrome.Locale.localize('no_photos');
    },

    /**
     * Set the time label
     * @param {string} label - current time
     * @memberOf app.Screensaver
     */
    setTimeLabel: function(label) {
      t.timeLabel = label;
    },
  };
})();
