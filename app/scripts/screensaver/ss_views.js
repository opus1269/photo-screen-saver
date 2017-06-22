/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Collection of {@link app.SSView} objects
 * @namespace
 */
app.SSViews = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Max number of views
   * @type {int}
   * @const
   * @default
   * @private
   * @memberOf app.SSViews
   */
  const _MAX_VIEWS = 20;

  /**
   * The array of views
   * @type {Array<app.SSView>}
   * @const
   * @private
   * @memberOf app.SSViews
   */
  const _views = [];

  /**
   * The neon-animated-pages
   * @type {?Element}
   * @private
   * @memberOf app.SSViews
   */
  let _pages = null;

  /**
   * The view type
   * @type {int}
   * @private
   * @memberOf app.SSViews
   */
  let _type = -1;

  /**
   * Process settings related to the photo's appearance
   * @private
   * @memberOf app.SSViews
   */
  function _setViewType() {
    _type = Chrome.Storage.getInt('photoSizing', 0);
    if (_type === 4) {
      // pick random sizing
      _type = Chrome.Utils.getRandomInt(0, 3);
    }
    let type = 'contain';
    switch (_type) {
      case 0:
        type = 'contain';
        break;
      case 1:
        type = 'cover';
        break;
      case 2:
      case 3:
        type = null;
        break;
    }
    app.Screensaver.setSizingType(type);
  }

  return {
    /**
     * Create the {@link app.SSView} pages
     * @param {app.Screensaver.Template} t - auto binding template
     * @memberOf app.SSViews
     */
    create: function(t) {
      _pages = t.$.pages;
      _setViewType();

      const len = Math.min(app.SSPhotos.getCount(), _MAX_VIEWS);
      for (let i = 0; i < len; i++) {
        const photo = app.SSPhotos.get(i);
        const view = app.SSView.createView(photo, _type);
        _views.push(view);
      }
      app.SSPhotos.setCurrentIndex(len);

      // set and update of animated pages
      t.set('_views', _views);
      t.$.repeatTemplate.render();

      // set the Elements of each view
      _views.forEach((view, index) => {
        const el = _pages.querySelector('#view' + index);
        const image = el.querySelector('.image');
        const author = el.querySelector('.author');
        const time = el.querySelector('.time');
        const location = el.querySelector('.location');
        const model = t.$.repeatTemplate.modelForElement(el);
        view.setElements(image, author, time, location, model);
      });
    },

    /**
     * Get the type of view
     * @returns {int} The view type
     * @memberOf app.SSViews
     */
    getType: function() {
      if (_type === -1) {
        _setViewType();
      }
      return _type;
    },

    /**
     * Get number of views
     * @returns {int} The number of views
     * @memberOf app.SSViews
     */
    getCount: function() {
      return _views.length;
    },

    /**
     * Get the {@link app.SSView} at the given index
     * @param {int} idx - The index
     * @returns {app.SSView} A {@link app.SSView}
     * @memberOf app.SSViews
     */
    get: function(idx) {
      return _views[idx];
    },

    /**
     * Get the selected index
     * @returns {int|undefined} The index
     * @memberOf app.SSViews
     */
    getSelected: function() {
      return _pages.selected;
    },

    /**
     * Set the selected index
     * @param {int} selected - The index
     * @memberOf app.SSViews
     */
    setSelected: function(selected) {
      _pages.selected = selected;
    },

    /**
     * Is the given idx the selected index
     * @param {int} idx - index into [t.views]{@link app.Screensaver.t}
     * @returns {boolean} true if selected
     * @memberOf app.SSViews
     */
    isSelected: function(idx) {
      return (idx === _pages.selected);
    },

    /**
     * Is the given {@link app.SSPhoto} in one of the {@link _views}
     * @param {app.SSPhoto} photo - A photo
     * @returns {boolean} true if in {@link _views}
     * @memberOf app.SSViews
     */
    hasPhoto: function(photo) {
      let ret = false;
      for (const view of _views) {
        if (view.photo.getId() === photo.getId()) {
          ret = true;
          break;
        }
      }
      return ret;
    },

    /**
     * Do we have a view with a usable photo
     * @returns {boolean} true if at least one photo is good
     * @memberOf app.SSViews
     */
    hasUsable: function() {
      let ret = false;
      for (let i = 0; i < _views.length; i++) {
        const view = _views[i];
        if (app.SSRunner.isCurrentPair(i)) {
          // don't check current animation pair
          continue;
        }
        if (!view.photo.isBad()) {
          ret = true;
          break;
        }
      }
      return ret;
    },

    /**
     * Replace all views
     * @memberOf app.SSViews
     */
    replaceAll: function() {
      for (let i = 0; i < _views.length; i++) {
        const view = _views[i];
        const photo = app.SSPhotos.getNextUsable();
        if (app.SSRunner.isCurrentPair(i)) {
          // don't replace current animation pair
          continue;
        }
        view.setPhoto(photo);
      }
      app.SSHistory.clear();
    },

    /**
     * Try to find a photo that has finished loading
     * @param {int} idx - index into {@link _views}
     * @returns {int} index into {@link _views}, -1 if none are loaded
     * @memberOf app.SSViews
     */
    findLoadedPhoto: function(idx) {
      if (!app.SSViews.hasUsable()) {
        // replace the photos
        app.SSViews.replaceAll();
      }

      if (_views[idx].isLoaded()) {
        return idx;
      }

      // wrap-around loop: https://stackoverflow.com/a/28430482/4468645
      for (let i = 0; i < _views.length; i++) {
        const index = (i + idx) % _views.length;
        const view = _views[index];
        if (app.SSRunner.isCurrentPair(index)) {
          // don't use current animation pair
          continue;
        }
        if (view.isLoaded()) {
          return index;
        } else if (view.isError() && !view.photo.isBad()) {
          view.photo.markBad();
          if (!app.SSPhotos.hasUsable()) {
            // all photos bad
            app.Screensaver.setNoPhotos();
            return -1;
          }
        }
      }
      return -1;
    },
  };
})();
