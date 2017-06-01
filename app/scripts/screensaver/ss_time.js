/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Screensaver time methods
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

	let template;

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
		 * @param {Object} t - screensaver template
		 * @memberOf app.SSTime
		 */
		setUpTransitionTime: function(t) {
			template = t;
			const trans = app.Storage.get('transitionTime');
			template.transitionTime = trans.base * 1000;
			template.waitTime = template.transitionTime;
			template.waitForLoad = true;

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
					app.GA.error(err.message,
						'chromep.alarms.get(CLOCK_ALARM)');
				});
			}
		},

		/**
		 * Set the time label
		 * @memberOf app.SSTime
		 */
		setTime: function() {
			const showTime = app.Storage.getInt('showTime', 0);
			if ((showTime !== 0) && template.p &&
				(template.p.selected !== undefined)) {
				template.set('time', app.Time.getStringShort());
			} else {
				template.set('time', '');
			}
		},
	};
})();
