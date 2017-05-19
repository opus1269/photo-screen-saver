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
	 * @property {string} cat - category
	 * @property {string} act - action
	 */

	/**
	 * Event types
	 * @type {Object}
	 * @property {GAEvent} INSTALLED - extension installed
	 * @property {GAEvent} MENU - main menu
	 * @property {GAEvent} TOGGLE - setting-toggle
	 * @const
	 * @memberOf app.GA
	 */
	const EVENT = {
		INSTALLED: {cat: 'extension', act: 'installed'},
		MENU: {cat: 'menu', act: 'select'},
		TOGGLE: {cat: 'settingsToggle', act: 'select'},
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
		ga('require', 'displayfeatures');
	}

	// listen for document and resources loaded
	window.addEventListener('load', _onLoad);

	return {

		EVENT: EVENT,

		/**
		 * Send a page
		 * @memberOf app.GA
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
		 * @memberOf app.GA
		 * @param {GAEvent} event - the event type
		 * @param {?string} [action=null] - override action
		 * @memberOf app.GA
		 */
		event: function(event, action=null) {
			if (event) {
				const act = action ? action : event.act;
				ga('send', 'event', event.cat, act);
			}
		},

		/**
		 * Send an error
		 * @memberOf app.GA
		 * @param {string} message - the error message
		 * @param {?string} [method=null] - the method name
		 * @param {boolean} [fatal=false] - is error fatal
		 * @memberOf app.GA
		 */
		error: function(message, method=null, fatal=false) {
			let msg = '';
			if (method) {
				msg = `Method: ${method} `;
			}
			msg+= `Error: ${message}`;
			if (message) {
				ga('send', 'exception', {
					'exDescription': msg,
					'exFatal': fatal,
				});
				console.error(message);
			}
		},

		/**
		 * Send an exception
		 * @memberOf app.GA
		 * @param {string} message - the error message
		 * @param {?string} [stack=null] - error stack
		 * @memberOf app.GA
		 */
		exception: function(message, stack=null) {
			if (message) {
				let msg = message;
				if (stack) {
					msg+= `\n${stack}`;
				}
				ga('send', 'exception', {
					'exDescription': msg,
					'exFatal': true,
				});
				console.error(msg);
			}
		},
	};

})();


