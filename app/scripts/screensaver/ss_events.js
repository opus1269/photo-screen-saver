/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Event handling for a {@link app.Screensaver}
 * @namespace
 */
app.SSEvents = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Starting mouse position
   * @type {{x: ?int, y: ?int}}
   * @const
   * @private
   * @memberOf app.SSEvents
   */
  const _MOUSE_START = {x: null, y: null};

  /**
   * Close ourselves
   * @private
   * @memberOf app.SSEvents
   */
  function _close() {
    // send message to other screen savers to close themselves
    Chrome.Msg.send(app.Msg.SS_CLOSE).catch(() => {});
    setTimeout(function() {
      // delay a little to process events
      window.close();
    }, 750);
  }

  return {
    // noinspection JSUnusedLocalSymbols
    /**
     * Event: Fired when a message is sent from either an extension<br>
     * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
     * @see https://developer.chrome.com/extensions/runtime#event-onMessage
     * @param {Chrome.Msg.Message} request - details for the message
     * @param {Object} [sender] - MessageSender object
     * @param {Function} [response] - function to call once after processing
     * @returns {boolean} true if asynchronous
     * @memberOf app.SSEvents
     */
    onMessage: function(request, sender, response) {
      if (request.message === app.Msg.SS_CLOSE.message) {
        _close();
      } else if (request.message === app.Msg.SS_IS_SHOWING.message) {
        // let people know we are here
        response({message: 'OK'});
      }
      return false;
    },

    /**
     * Event: keydown
     * @memberOf app.SSEvents
     */
    onKeyDown: function() {
      _close();
    },

    /**
     * Event: mousemove
     * @param {Event} ev - mousemove event
     * @memberOf app.SSEvents
     */
    onMouseMove: function(ev) {
      if (_MOUSE_START.x && _MOUSE_START.y) {
        const deltaX = Math.abs(ev.clientX - _MOUSE_START.x);
        const deltaY = Math.abs(ev.clientY - _MOUSE_START.y);
        if (Math.max(deltaX, deltaY) > 10) {
          // close after a minimum amount of mouse movement
          _close();
        }
      } else {
        // first move, set values
        _MOUSE_START.x = ev.clientX;
        _MOUSE_START.y = ev.clientY;
      }
    },

    /**
     * Event: mouse click
     * @memberOf app.SSEvents
     */
    onMouseClick: function() {
      const t = app.Screensaver.getTemplate();
      if (t.started) {
        app.Photo.showSource(t.views[t.p.selected].photo);
      }
      _close();
    },
  };
})();
