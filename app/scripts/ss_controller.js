/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};
app.SSControl = (function() {
	'use strict';

	/**
	 * Controller for the screen saver
	 * @namespace SSControl
	 */

	/**
	 * Determine if there is a full screen chrome window running on a display
	 * @param {object} display a connected display
	 * @param {function} callback (boolean) - true if there is a full screen
	 * window on the display
	 * @private
	 * @memberOf SSControl
	 */
	function _hasFullscreen(display, callback) {
		callback = callback || function() {};

		if (app.Utils.getBool('chromeFullscreen')) {
			chrome.windows.getAll({populate: false}, function(wins) {
				const left = display ? display.bounds.left : 0;
				const top = display ? display.bounds.top : 0;
				for (let i = 0; i < wins.length; i++) {
					const win = wins[i];
					if ((win.state === 'fullscreen') &&
						(!display || (win.top === top && win.left === left))) {
						callback(true);
						return;
					}
				}
				callback(false);
			});
		} else {
			callback(false);
		}
	}

	/**
	 * Determine if the screen saver is currently showing
	 * @param {function} callback - callback(isShowing)
	 * @private
	 * @memberOf SSControl
	 */
	function _isShowing(callback) {
		callback = callback || function() {};

		// send message to the screen saver to see if he is around
		chrome.runtime.sendMessage({
			message: 'isShowing',
		}, null, function(response) {
			if (response) {
				// screen saver responded
				callback(true);
			} else {
				callback(false);
			}
		});
	}

	/**
	 * Open a screen saver window on the given display
	 * @param {object} display a connected display
	 * @private
	 * @memberOf SSControl
	 */
	function _open(display) {
		_hasFullscreen(display, function(isTrue) {
			// don't display if there is a fullscreen window
			const left = display ? display.bounds.left : 0;
			const top = display ? display.bounds.top : 0;
			if (!isTrue) {
				if (app.Utils.getChromeVersion() >= 44 && !display) {
					// Chrome supports fullscreen option on create since
					// version 44
					chrome.windows.create({
						url: '/html/screensaver.html',
						focused: true,
						type: 'popup',
						state: 'fullscreen',
					});
				} else {
					chrome.windows.create({
						url: '/html/screensaver.html',
						left: left,
						top: top,
						width: 1,
						height: 1,
						focused: true,
						type: 'popup',
					}, function(win) {
						chrome.windows.update(win.id, {state: 'fullscreen'});
					});
				}
			}
		});
	}

	/**
	 * Open a screensaver on every display
	 * @private
	 * @memberOf SSControl
	 */
	function _openOnAllDisplays() {
		chrome.system.display.getInfo(function(displayInfo) {
			if (displayInfo.length === 1) {
				_open(null);
			} else {
				for (let i = 0; i < displayInfo.length; i++) {
					_open(displayInfo[i]);
				}
			}
		});
	}

	/**
	 * Event: Fired when the system changes to an active, idle or locked state.
	 * The event fires with "locked" if the screen is locked or the screensaver
	 * activates, "idle" if the system is unlocked and the user has not
	 * generated any input for a specified number of seconds, and "active"
	 * when the user generates input on an idle system.
	 * @see https://developer.chrome.com/extensions/idle#event-onStateChanged
	 * @param {String} state - current state of computer
	 * @private
	 * @memberOf SSControl
	 */
	function _onIdleStateChanged(state) {
		_isShowing(function(isShowing) {
			if (state === 'idle' && app.Alarm.isActive() && !isShowing) {
				app.SSControl.display(false);
			} else {
				if (!app.Utils.isWin()) {
					// Windows 10 Creator triggers an 'active' state
					// when the window is created so we have to skip
					// closing here
					app.SSControl.close();
				}
			}
		});
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {object} request - details for the message
	 * @param {string} request.message - name of the message
	 * @param {object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @return {boolean} true if asynchronous
	 * @private
	 * @memberOf SSControl
	 */
	function _onChromeMessage(request, sender, response) {
		if (request.message === 'showScreensaver') {
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
		 * @param {Boolean} single if true only show on one display
		 * @memberOf SSControl
		 */
		display: function(single) {
			if (!single && app.Utils.getBool('allDisplays')) {
				_openOnAllDisplays();
			} else {
				_open(null);
			}
		},

		/**
		 * Close all the screen saver windows
		 * @memberOf SSControl
		 */
		close: function() {
			// send message to the screen savers to close themselves
			chrome.runtime.sendMessage({
				message: 'close',
			}, function(response) {});
		},
	};
})();
