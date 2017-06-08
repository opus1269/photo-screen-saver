/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Time handling for an {@link app.Screensaver}
 * @namespace
 */
app.SSTime = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Repeating alarm for updating time label
   * @type {string}
   * @private
   * @memberOf app.SSTime
   */
  let _CLOCK_ALARM;

  /**
   * Event: Listen for alarms
   * @param {Object} alarm - chrome alarm
   * @param {string} alarm.name - alarm type
   * @memberOf app.SSTime
   */
  function _onAlarm(alarm) {
    if (alarm.name === _CLOCK_ALARM) {
      // update time label
      app.SSTime.setTime();
    }
  }

  return {
    /**
     * Initialize the time display
     * @memberOf app.SSTime
     */
    initialize: function() {
      const showTime = Chrome.Storage.getInt('showTime', 0);
      if (showTime === 0) {
        return;
      }

      // add repeating alarm to update time label
      // append random string so each screensaver gets its own
      _CLOCK_ALARM = `clock${app.Utils.randomString()}`;
      chrome.alarms.onAlarm.addListener(_onAlarm);
      chrome.alarms.create(_CLOCK_ALARM, {
        when: Date.now(),
        periodInMinutes: 1.1,
      });
    },

    /**
     * Set the time label
     * @memberOf app.SSTime
     */
    setTime: function() {
      const t = app.Screensaver.getTemplate();
      const showTime = Chrome.Storage.getInt('showTime', 0);
      if ((showTime !== 0) && t.started) {
        t.set('time', app.Time.getStringShort());
      } else {
        t.set('time', '');
      }
    },
  };
})();
