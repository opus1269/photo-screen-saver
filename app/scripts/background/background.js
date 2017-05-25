/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	'use strict';

	/**
	 * The background script for the extension.<br>
	 * @namespace app.Background
	 */

	new ExceptionHandler();

	/**
	 * Display the options tab
	 * @private
	 * @memberOf app.Background
	 */
	function _showOptionsTab() {
		// send message to the option tab to focus it.
		app.Msg.send(app.Msg.HIGHLIGHT).catch(() => {
			// no one listening, create it
			chrome.tabs.create({url: '../html/options.html'});
		});
	}

	/**
	 * Toggle enabled state of the screen saver
	 * @private
	 * @memberOf app.Background
	 */
	function _toggleEnabled() {
		app.Storage.set('enabled', !app.Storage.getBool('enabled'));
		// storage changed event not fired on same page as the change
		app.Data.processState('enabled');
	}

	/**
	 * Event: Fired when the extension is first installed,<br />
	 * when the extension is updated to a new version,<br />
	 * and when Chrome is updated to a new version.
	 * @see https://developer.chrome.com/extensions/runtime#event-onInstalled
	 * @param {Object} details - type of event
	 * @private
	 * @memberOf app.Background
	 */
	function _onInstalled(details) {
		const chromep = new ChromePromise();

		// create menus on the right click menu of the extension icon
		chromep.contextMenus.create({
			type: 'normal',
			id: 'ENABLE_MENU',
			title: app.Utils.localize('disable'),
			contexts: ['browser_action'],
		}).catch((err) => {
			if (!err.message.includes('duplicate id')) {
				app.GA.error(err.message, 'chromep.contextMenus.create');
			}
		});

		chromep.contextMenus.create({
			type: 'separator',
			id: 'SEP_MENU',
			contexts: ['browser_action'],
		}).catch((err) => {
			if (!err.message.includes('duplicate id')) {
				app.GA.error(err.message, 'chromep.contextMenus.create');
			}
		});

		if (details.reason === 'install') {
			app.GA.event(app.GA.EVENT.INSTALLED);
			app.Data.initialize();
			_showOptionsTab();
		} else if (details.reason === 'update') {
			// extension updated
			app.Data.update();
		}
	}

	/**
	 * Event: Fired when a profile that has this extension installed first
	 * starts up
	 * @see https://developer.chrome.com/extensions/runtime#event-onStartup
	 * @private
	 * @memberOf app.Background
	 */
	function _onStartup() {
		app.GA.page('/background.html');
		app.Data.processState();
	}

	/**
	 * Event: Fired when a browser action icon is clicked.
	 * @see https://goo.gl/abVwKu
	 * @private
	 * @memberOf app.Background
	 */
	function _onIconClicked() {
		_showOptionsTab();
	}

	/**
	 * Event: Fired when item in localStorage changes
	 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
	 * @param {Event} event - StorageEvent
	 * @param {string} event.key - storage item that changed
	 * @private
	 * @memberOf app.Background
	 */
	function _onStorageChanged(event) {
		app.Data.processState(event.key);
	}

	/**
	 * Event: Fired when a context menu item is clicked.
	 * @see https://developer.chrome.com/extensions/contextMenus#event-onClicked
	 * @param {Object} info - info. on the clicked menu
	 * @param {Object} info.menuItemId - menu name
	 * @private
	 * @memberOf app.Background
	 */
	function _onMenuClicked(info) {
		if (info.menuItemId === 'ENABLE_MENU') {
			_toggleEnabled();
		}
	}

	/**
	 * Event: Fired when a registered command is activated using
	 * a keyboard shortcut.
	 * @see https://developer.chrome.com/extensions/commands#event-onCommand
	 * @param {string} cmd - keyboard command
	 * @private
	 * @memberOf app.Background
	 */
	function _onKeyCommand(cmd) {
		if (cmd === 'toggle-enabled') {
			_toggleEnabled();
		}
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {Object} request - details for the message
	 * @param {string} request.message - name of the message
	 * @param {Object} sender - MessageSender object
	 * @param {function} response - function _to call once after processing
	 * @returns {boolean} true if asynchronous
	 * @private
	 * @memberOf app.Background
	 */
	function _onChromeMessage(request, sender, response) {
		if (request.message === app.Msg.RESTORE_DEFAULTS.message) {
			app.Data.restoreDefaults();
		}
		return false;
	}

	// listen for extension install or update
	chrome.runtime.onInstalled.addListener(_onInstalled);

	// listen for Chrome starting
	chrome.runtime.onStartup.addListener(_onStartup);

	// listen for click on the icon
	chrome.browserAction.onClicked.addListener(_onIconClicked);

	// listen for changes to the stored data
	addEventListener('storage', _onStorageChanged, false);

	// listen for chrome messages
	app.Msg.listen(_onChromeMessage);

	// listen for clicks on context menus
	chrome.contextMenus.onClicked.addListener(_onMenuClicked);

	// listen for special keyboard commands
	chrome.commands.onCommand.addListener(_onKeyCommand);
})();
