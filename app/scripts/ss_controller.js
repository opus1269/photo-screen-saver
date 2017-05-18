/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Controller for the screen saver
 * @namespace
 */
app.SSControl = (function() {
	'use strict';

	const chromep = new ChromePromise();

	if (typeof window.onerror === 'object') {
		// global error handler
		window.onerror = function(message, url, line, col, errObject) {
			if (app && app.GA) {
				let msg = message;
				let stack = null;
				if (errObject && errObject.message && errObject.stack) {
					msg = errObject.message;
					stack = errObject.stack;
				}
				app.GA.exception(msg, stack);
			}
		};
	}

	/**
	 * Screensaver URL
	 * @type {string}
	 * @default
	 * @const
	 * @private
	 * @memberOf app.SSControl
	 */
	const _SS_URL = '/html/screensaver.html';

	/**
	 * Determine if there is a full screen chrome window running on a display
	 * @param {Object} display - a connected display
	 * @returns {Promise<boolean>} true if there is a full screen
	 * window on the display
	 * @private
	 * @memberOf app.SSControl
	 */
	function _hasFullscreen(display) {
		if (app.Storage.getBool('chromeFullscreen')) {
			return chromep.windows.getAll({populate: false}).then((wins) => {
				let ret = false;
				const left = display ? display.bounds.left : 0;
				const top = display ? display.bounds.top : 0;
				for (let i = 0; i < wins.length; i++) {
					const win = wins[i];
					if ((win.state === 'fullscreen') &&
						(!display || (win.top === top && win.left === left))) {
						ret = true;
						break;
					}
				}
				return Promise.resolve(ret);
			});
		} else {
			return Promise.resolve(false);
		}
	}

	/**
	 * Determine if the screen saver is currently showing
	 * @returns {Promise<boolean>} true if showing
	 * @private
	 * @memberOf app.SSControl
	 */
	function _isShowing() {
		// send message to the screensaver to see if he is around
		return app.Msg.send(app.Msg.SS_IS_SHOWING).then(() => {
			return Promise.resolve(true);
		}).catch(() => {
			// no one listening
			return Promise.resolve(false);
		});
	}

	/**
	 * Open a screen saver window on the given display
	 * @param {Object} display - a connected display
	 * @private
	 * @memberOf app.SSControl
	 */
	function _open(display) {
		// window creation options
		const winOpts = {
			url: _SS_URL,
			focused: true,
			type: 'popup',
		};
		_hasFullscreen(display).then((isTrue) => {
			if (isTrue) {
				// don't display if there is a fullscreen window
				return null;
			}

			if (app.Utils.getChromeVersion() >= 44 && !display) {
				// Chrome supports fullscreen option on create since version 44
				winOpts.state = 'fullscreen';
			} else {
				const left = display ? display.bounds.left : 0;
				const top = display ? display.bounds.top : 0;
				winOpts.left = left;
				winOpts.top = top;
				winOpts.width = 1;
				winOpts.height = 1;
			}

			return chromep.windows.create(winOpts);
		}).then((win) => {
			if (win && (winOpts.state !== 'fullscreen')) {
				chrome.windows.update(win.id, {state: 'fullscreen'});
			}
			return null;
		}).catch((err) => {
			app.GA.error(err.message, 'app.SSControl._open', true);
		});
	}

	/**
	 * Open a screensaver on every display
	 * @private
	 * @memberOf app.SSControl
	 */
	function _openOnAllDisplays() {
		chromep.system.display.getInfo().then((displayInfo) => {
			if (displayInfo.length === 1) {
				_open(null);
			} else {
				for (let i = 0; i < displayInfo.length; i++) {
					_open(displayInfo[i]);
				}
			}
			return null;
		}).catch((err) => {
			app.GA.error(err.message, 'app.SSControl._openOnAllDisplays', true);
		});
	}

	/**
	 * Event: Fired when the system changes to an active, idle or locked state.
	 * The event fires with "locked" if the screen is locked or the screensaver
	 * activates, "idle" if the system is unlocked and the user has not
	 * generated any input for a specified number of seconds, and "active"
	 * when the user generates input on an idle system.
	 * @see https://developer.chrome.com/extensions/idle#event-onStateChanged
	 * @param {string} state - current state of computer
	 * @private
	 * @memberOf app.SSControl
	 */
	function _onIdleStateChanged(state) {
		_isShowing().then((isTrue) => {
			if (state === 'idle' && app.Alarm.isActive() && !isTrue) {
				app.SSControl.display(false);
			} else {
				if (!app.Utils.isWin()) {
					// Windows 10 Creator triggers an 'active' state
					// when the window is created so we have to skip
					// closing here
					app.SSControl.close();
				}
			}
			return null;
		}).catch((err) => {
			app.GA.error(err.message, 'app.SSControl._isShowing');
		});
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {Object} request - details for the message
	 * @param {string} request.message - name of the message
	 * @param {Object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @returns {boolean} true if asynchronous
	 * @private
	 * @memberOf app.SSControl
	 */
	function _onChromeMessage(request, sender, response) {
		if (request.message === app.Msg.SS_SHOW.message) {
			// preview the screensaver
			app.SSControl.display(true);
		}
		return false;
	}

	// listen for changes to the idle state of the computer
	chrome.idle.onStateChanged.addListener(_onIdleStateChanged);

	// listen for chrome messages
	chrome.runtime.onMessage.addListener(_onChromeMessage);

	return {
		/**
		 * Display the screen saver(s)
		 * !Important: Always request screensaver through this call
		 * @param {boolean} single - if true only show on one display
		 * @memberOf app.SSControl
		 */
		display: function(single) {
			if (!single && app.Storage.getBool('allDisplays')) {
				_openOnAllDisplays();
			} else {
				_open(null);
			}
		},

		/**
		 * Close all the screen saver windows
		 * @memberOf app.SSControl
		 */
		close: function() {
			// send message to the screen savers to close themselves
			app.Msg.send(app.Msg.SS_CLOSE).catch(() => {});
		},
	};
})();
