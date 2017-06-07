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
   * @const
   * @default
   * @private
   * @memberOf app.SSTime
   */
  const _CLOCK_ALARM = 'updateTimeLabel';

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
     * Setup photo transition time
     * @memberOf app.SSTime
     */
    setUpTransitionTime: function() {
      const trans = app.Storage.get('transitionTime');
      const showTime = app.Storage.getInt('showTime', 0);
      if ((showTime !== 0) && (trans.base > 60)) {
        // add repeating alarm to update time label
        // if transition time is more than 1 minute
        // and time label is showing
        chrome.alarms.onAlarm.addListener(_onAlarm);

        const chromep = new ChromePromise();
        chromep.alarms.get(_CLOCK_ALARM).then((alarm) => {
          if (!alarm) {
            chrome.alarms.create(_CLOCK_ALARM, {
              when: Date.now(),
              periodInMinutes: 1,
            });
          }
          return null;
        }).catch((err) => {
          Chrome.GA.error(err.message,
              'chromep.alarms.get(CLOCK_ALARM)');
        });
      }
    },

    /**
     * Set the time label
     * @memberOf app.SSTime
     */
    setTime: function() {
      const t = app.Screensaver.getTemplate();
      const showTime = app.Storage.getInt('showTime', 0);
      if ((showTime !== 0) && t.started) {
        t.set('time', app.Time.getStringShort());
      } else {
        t.set('time', '');
      }
    },
  };
})();
