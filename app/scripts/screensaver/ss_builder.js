/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Builder for a {@link app.Screensaver}
 * @namespace
 */
app.SSBuilder = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Max number of animated pages
   * @type {int}
   * @const
   * @default
   * @private
   * @memberOf app.SSBuilder
   */
  const _MAX_PAGES = 20;

  /**
   * Build the {@link app.SSPhotos} that will be displayed
   * @returns {boolean} true if there is at least one photo
   * @private
   * @memberOf app.SSBuilder
   */
  function _loadPhotos() {
    let sources = app.PhotoSource.getSelectedPhotos();
    sources = sources || [];
    for (const source of sources) {
      app.SSPhotos.addFromSource(source);
    }

    if (!app.SSPhotos.getCount()) {
      // No usable photos
      app.Screensaver.setNoPhotos();
      return false;
    }

    if (Chrome.Storage.getBool('shuffle')) {
      // randomize the order
      app.SSPhotos.shuffle();
    }
    return true;
  }

  /**
   * Create the [t.views]{@link app.Screensaver.t} that will be animated
   * @private
   * @memberOf app.SSBuilder
   */
  function _createPages() {
    const t = app.Screensaver.getTemplate();
    const viewType = app.Screensaver.getViewType();
    const len = Math.min(app.SSPhotos.getCount(), _MAX_PAGES);
    for (let i = 0; i < len; i++) {
      const photo = app.SSPhotos.get(i);
      const view = app.SSView.createView(photo, viewType);
      app.Screensaver.addView(view);
    }
    app.SSFinder.setPhotosIndex(len);

    // force update of animated pages
    app.Screensaver.renderPages();

    // set the Elements of each view
    const views = app.Screensaver.getViews();
    views.forEach((view, index) => {
      const el = t.p.querySelector('#view' + index);
      const image = el.querySelector('.image');
      const author = el.querySelector('.author');
      const time = el.querySelector('.time');
      const location = el.querySelector('.location');
      const model = t.rep.modelForElement(el);
      view.setElements(image, author, time, location, model);
    });
  }

  return {
    /**
     * Build everything related to a {@link app.Screensaver}
     * @returns {boolean} true if there are photos for the show
     * @memberOf app.SSBuilder
     */
    build: function() {
      // load the photos for the slide show
      const hasPhotos = _loadPhotos();
      if (hasPhotos) {
        // create the animated pages
        _createPages();
        // initialize the photo finder
        app.SSFinder.initialize();
      }
      return hasPhotos;
    },
  };
})();
