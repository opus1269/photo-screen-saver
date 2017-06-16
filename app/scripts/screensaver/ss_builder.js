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
   * Process settings related to the photo's appearance
   * @private
   * @memberOf app.SSBuilder
   */
  function _setupPhotoSizing() {
    const t = app.Screensaver.getTemplate();
    t.photoSizing = Chrome.Storage.getInt('photoSizing', 0);
    if (t.photoSizing === 4) {
      // pick random sizing
      t.photoSizing = Chrome.Utils.getRandomInt(0, 3);
    }
    switch (t.photoSizing) {
      case 0:
        t.sizingType = 'contain';
        break;
      case 1:
        t.sizingType = 'cover';
        break;
      case 2:
      case 3:
        t.sizingType = null;
        break;
      default:
        t.sizingType = 'contain';
        break;
    }
  }

  /**
   * Process settings related to between photo transitions
   * @private
   * @memberOf app.SSBuilder
   */
  function _setupPhotoTransitions() {
    const t = app.Screensaver.getTemplate();
    let type = Chrome.Storage.getInt('photoTransition', 0);
    if (type === 8) {
      // pick random transition
      type = Chrome.Utils.getRandomInt(0, 7);
    }
    t.set('aniType', type);

    app.SSTime.initialize();
  }

  /**
   * Set the window zoom factor to 1.0
   * @private
   * @memberOf app.SSBuilder
   */
  function _setZoom() {
    if (Chrome.Utils.getChromeVersion() >= 42) {
      // override zoom factor to 1.0 - chrome 42 and later
      const chromep = new ChromePromise();
      chromep.tabs.getZoom().then((zoomFactor) => {
        if ((zoomFactor <= 0.99) || (zoomFactor >= 1.01)) {
          chrome.tabs.setZoom(1.0);
        }
        return null;
      }).catch((err) => {
        Chrome.GA.error(err.message, 'chromep.tabs.getZoom');
      });
    }
  }

  /**
   * Build the [t.photos]{@link app.Screensaver.t} array that will be displayed
   * @returns {boolean} true if there is at least one photo
   * @private
   * @memberOf app.SSBuilder
   */
  function _loadPhotos() {
    const t = app.Screensaver.getTemplate();
    let sources = app.PhotoSource.getSelectedPhotos();
    sources = sources || [];
    for (const source of sources) {
      const type = source.type;
      let ct = 0;
      for (const sourcePhoto of source.photos) {
        if (!app.Photo.ignore(sourcePhoto.asp, t.photoSizing)) {
          const photo = new app.Photo('photo' + ct, sourcePhoto, type);
          app.Screensaver.addPhoto(photo);
          ct++;
        }
      }
    }

    const photos = app.Screensaver.getPhotos();
    if (!photos || (photos.length === 0)) {
      // No usable photos
      app.Screensaver.setNoPhotos();
      return false;
    }

    if (Chrome.Storage.getBool('shuffle')) {
      // randomize the order
      Chrome.Utils.shuffleArray(photos);
      // rename
      photos.forEach((photo, index) => {
        photo.name = 'photo' + index;
      });
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
    const photos = app.Screensaver.getPhotos();
    const len = Math.min(photos.length, _MAX_PAGES);
    for (let i = 0; i < len; i++) {
      const photo = photos[i];
      const view = app.SSView.createView(photo, t.photoSizing);
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
      _setZoom();
      _setupPhotoSizing();
      _setupPhotoTransitions();

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
