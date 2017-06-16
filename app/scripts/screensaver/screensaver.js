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
   * @property {boolean} paused - true if slideshow paused
   * @property {boolean} noPhotos - true if there are no usable photos
   * @property {string} noPhotosLabel - label when no photos are useable
   * @property {string} timeLabel - current time label
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
  t.paused = false;
  t.noPhotos = false;
  t.noPhotosLabel = '';
  t.timeLabel = '';

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

    app.Screensaver.launch();
  }

  // listen for dom-change
  t.addEventListener('dom-change', _onDomChange);

  return {
    /**
     * Launch the slide show
     * @param {int} [delay=2000] - delay before start
     * @memberOf app.Screensaver
     */
    launch: function(delay = 2000) {
      const hasPhotos = app.SSBuilder.build();
      if (hasPhotos) {
        // kick off the slide show if there are photos selected
        app.SSRunner.start(delay);
      }
    },

    /**
     * Render the animated pages
     * @memberOf app.Screensaver
     */
    renderPages: function() {
      t.rep.render();
    },

    /**
     * Get reference to the auto-binding template
     * @returns {app.Screensaver.Template} The auto-binding template
     * @memberOf app.Screensaver
     */
    getTemplate: function() {
      return t;
    },

    /**
     * Get the selected index
     * @returns {int|undefined} The index
     * @memberOf app.Screensaver
     */
    getSelected: function() {
      return t.p.selected;
    },

    /**
     * Set the selected index
     * @param {int} selected - The index
     * @memberOf app.Screensaver
     */
    setSelected: function(selected) {
      t.p.selected = selected;
    },

    /**
     * Do we have usable photos
     * @returns {boolean} true if we have usable photos
     * @memberOf app.Screensaver
     */
    hasPhotos: function() {
      return !t.noPhotos;
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
     * Get reference to [t.views]{@link app.Screensaver.Template}
     * @returns {Array<app.SSView>} The views
     * @memberOf app.Screensaver
     */
    getViews: function() {
      return t.views;
    },

    /**
     * Add view to [t.views]{@link app.Screensaver.Template}
     * @param {app.SSView} view - The view to add
     * @memberOf app.Screensaver
     */
    addView: function(view) {
      t.push('views', view);
    },

    /**
     * Get reference to [t.photos]{@link app.Screensaver.Template}
     * @returns {app.Photo[]} The photos
     * @memberOf app.Screensaver
     */
    getPhotos: function() {
      return t.photos;
    },

    /**
     * Add photo to [t.photos]{@link app.Screensaver.Template}
     * @param {app.Photo} photo - The photo to add
     * @memberOf app.Screensaver
     */
    addPhoto: function(photo) {
      t.photos.push(photo);
    },

    /**
     * Set the time label
     * @param {string} label - current time
     * @memberOf app.Screensaver
     */
    setTimeLabel: function(label) {
      t.timeLabel = label;
    },

    /**
     * Set the state when slideshow is paused
     * @param {boolean} paused - paused state
     * @memberOf app.Screensaver
     */
    setPaused: function(paused) {
      t.paused = paused;
      if (paused) {
        t.$.pauseImage.classList.add('fadeOut');
        t.$.playImage.classList.remove('fadeOut');
      } else {
        t.$.playImage.classList.add('fadeOut');
        t.$.pauseImage.classList.remove('fadeOut');
      }
    },
  };
})();
