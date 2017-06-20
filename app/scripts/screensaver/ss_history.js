/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Track the recent history of a {@link app.Screensaver} traversal
 * @namespace
 */
app.SSHistory = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * History item
   * @typedef {Object} app.SSHistory.Item
   * @property {int} viewsIdx - t.views index
   * @property {int} replaceIdx - t.views index
   * @property {int} lastViewsIdx - t.views index
   * @property {int} photoId - {@link app.SSPhoto} id
   * @property {int} photosPos - pointer into {@link app.SSPhotos}
   * @memberOf app.SSHistory
   */

  /**
   * Slide show history
   * @property {Array<app.SSHistory.Item>} arr - history items
   * @property {int} idx - pointer into arr
   * @property {int} max - max length of arr, it will actually have 1 item more
   * @consts
   * @private
   * @memberOf app.SSHistory
   */
  const history = {
    arr: [],
    idx: -1,
    max: 20, // todo
  };

  return {
    /**
     * Initialize the history
     * @memberOf app.SSHistory
     */
    initialize: function() {
      history.max = Math.min(app.SSPhotos.getCount(), history.max);
    },

    /**
     * Add item to the history
     * @param {?int} newIdx - if not null, a request from the back command
     * @param {int} selected - the current selection
     * @param {int} lastSelected - the last selection
     * @param {int} replaceIdx - the replace index
     * @memberOf app.SSHistory
     */
    add: function(newIdx, selected, lastSelected, replaceIdx) {
      const views = app.Screensaver.getViews();
      const idx = history.idx;
      const len = history.arr.length;
      if (newIdx === null) {
        const photoId = views[selected].photo.getId();
        const photosPos = app.SSPhotos.getCurrentIndex();
        const historyItem = {
          viewsIdx: selected,
          replaceIdx: replaceIdx,
          lastViewsIdx: lastSelected,
          photoId: photoId,
          photosPos: photosPos,
        };
        if ((idx === len - 1)) {
          // add to end
          if (history.arr.length > history.max) {
            // FIFO delete
            history.arr.shift();
            history.idx--;
            history.idx = Math.max(history.idx, -1);
          }
          // add newest photo
          history.arr.push(historyItem);
        }
      }
      history.idx++;
    },

    /**
     * Reset the slide show history
     * @memberOf app.SSHistory
     */
    clear: function() {
      history.arr = [];
      history.idx = -1;
    },

    /**
     * Update the history for the given t.views index
     * @param {int} viewsIdx - t.views index
     * @param {int} photoId - {@link app.SSPhotos} index
     * @param {int} photosPos - {@link app.SSPhotos} index
     * @memberOf app.SSHistory
     */
    update: function(viewsIdx, photoId, photosPos) {
      for (const item of history.arr) {
        if (item.viewsIdx === viewsIdx) {
          item.photoId = photoId;
          item.photosPos = photosPos;
        }
      }
    },

    /**
     * Backup one slide
     * @returns {?int} t.views index to step to
     * @memberOf app.SSHistory
     */
    back: function() {
      if (history.idx <= 0) {
        // at beginning
        return null;
      }

      let nextStep = null;
      let inc = 2;
      let idx = history.idx - inc;
      history.idx = idx;
      if (idx < 0) {
        history.idx = -1;
        if ((history.arr.length > history.max)) {
          // at beginning of history
          return null;
        } else {
          // at beginning, first time through
          inc = 1;
          nextStep = -1;
          idx = 0;
        }
      }

      // update state from history
      const photosPos = history.arr[idx].photosPos;
      const replaceIdx = history.arr[idx + inc].replaceIdx;
      // const lastSelected = history.arr[idx+1].lastViewsIdx;
      app.SSPhotos.setCurrentIndex(photosPos);
      app.SSRunner.setReplaceIdx(replaceIdx);
      // app.SSRunner.setLastSelected(lastSelected);

      const viewsIdx = history.arr[idx].viewsIdx;
      const photoId = history.arr[idx].photoId;
      nextStep = (nextStep === null) ? viewsIdx : nextStep;
      const views = app.Screensaver.getViews();
      const photo = app.SSPhotos.get(photoId);
      views[viewsIdx].setPhoto(photo);
      views[viewsIdx].render();

      return nextStep;
    },
  };
})();
