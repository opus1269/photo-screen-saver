/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Manage Google Analytics tracking
 * @namespace
 */
app.GA = (function() {
	'use strict';

	/**
	 * Tracking ID
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GA
	 */
	const TRACKING_ID = 'UA-61314754-1';

	/**
	 * Google Analytics Event
	 * @typedef {Object} GAEvent
	 * @property {string} eventCategory - category
	 * @property {string} eventAction - action
	 * @property {string} eventLabel - label
	 * @property {boolean} noInteraction - direct user interaction?
	 */

	/**
	 * Event types
	 * @type {{}}
	 * @property {GAEvent} INSTALLED - extension installed
	 * @property {GAEvent} MENU - menu selected
	 * @property {GAEvent} TOGGLE - setting-toggle
	 * @property {GAEvent} LINK - setting-link
	 * @property {GAEvent} BUTTON - button click
	 * @const
	 * @memberOf app.GA
	 */
	const EVENT = {
		INSTALLED: {
			eventCategory: 'extension',
			eventAction: 'installed',
			eventLabel: '',
		},
		MENU: {
			eventCategory: 'ui',
			eventAction: 'menuSelect',
			eventLabel: '',
		},
		TOGGLE: {
			eventCategory: 'ui',
			eventAction: 'toggle',
			eventLabel: '',
		},
		LINK: {
			eventCategory: 'ui',
			eventAction: 'linkSelect',
			eventLabel: '',
		},
		BUTTON: {
			eventCategory: 'ui',
			eventAction: 'buttonClicked',
			eventLabel: '',
		},
		ICON: {
			eventCategory: 'ui',
			eventAction: 'toolbarIconClicked',
			eventLabel: '',
		},
	};

	/**
	 * Event: called when document and resources are loaded<br />
	 * Initialize Google Analytics
	 * @private
	 * @memberOf app.GA
	 */
	function _onLoad() {
		// Standard Google Universal Analytics code
		// noinspection OverlyComplexFunctionJS
		(function(i, s, o, g, r, a, m) {
			i['GoogleAnalyticsObject'] = r;
			// noinspection CommaExpressionJS
			i[r] = i[r] || function() {
					(i[r].q = i[r].q || []).push(arguments);
				}, i[r].l = 1 * new Date();
			// noinspection CommaExpressionJS
			a = s.createElement(o),
				m = s.getElementsByTagName(o)[0];
			a.async = 1;
			a.src = g;
			m.parentNode.insertBefore(a, m);
		})(window, document, 'script',
			'https://www.google-analytics.com/analytics.js', 'ga');
		ga('create', TRACKING_ID, 'auto');
		// see: http://stackoverflow.com/a/22152353/1958200
		ga('set', 'checkProtocolTask', function() { });
		ga('set', 'appName', 'Photo Screensaver');
		ga('set', 'appId', 'photo-screen-saver');
		ga('set', 'appVersion', app.Utils.getVersion());
		ga('require', 'displayfeatures');
	}

	// listen for document and resources loaded
	window.addEventListener('load', _onLoad);

	return {
		EVENT: EVENT,

		/**
		 * Send a page
		 * @param {string} page - page path
		 * @memberOf app.GA
		 */
		page: function(page) {
			if (page) {
				ga('send', 'pageview', page);
			}
		},

		/**
		 * Send an event
		 * @param {GAEvent} event - the event type
		 * @param {?string} [label=null] - override label
		 * @param {?string} [action=null] - override action
		 * @memberOf app.GA
		 */
		event: function(event, label=null, action=null) {
			if (event) {
				const ev = app.JSONUtils.shallowCopy(event);
				ev.hitType = 'event';
				ev.eventLabel = label ? label : ev.eventLabel;
				ev.eventAction = action ? action : ev.eventAction;
				ga('send', ev);
			}
		},

		/**
		 * Send an error
		 * @param {?string} [label=null] - override label
		 * @param {?string} [action=null] - override action
		 * @memberOf app.GA
		 */
		error: function(label=null, action=null) {
			const ev = {
				hitType: 'event',
				eventCategory: 'error',
				eventAction: 'unknownMethod',
				eventLabel: 'Err: unknown',
			};
			ev.eventLabel = label ? `Err: ${label}` : ev.eventLabel;
			ev.eventAction = action ? action : ev.eventAction;
			ga('send', ev);
			console.error('Error: ', ev);
		},

		/**
		 * Send an exception
		 * @param {string} message - the error message
		 * @param {?string} [stack=null] - error stack
		 * @param {boolean} [fatal=null] - true if fatal
		 * @memberOf app.GA
		 */
		exception: function(message, stack = null, fatal = true) {
			try {
				let msg = '';
				if (message) {
					msg += message;
				}
				if (stack) {
					msg += `\n${stack}`;
				}
				const ex = {
					hitType: 'exception',
					exDescription: msg,
					exFatal: fatal,
				};
				ga('send', ex);
				console.error('Exception caught: ', ex);
			} catch(err) {
				// noinspection BadExpressionStatementJS
				Function.prototype;
			}
		},
	};
})();


