/*
@@license
*/
(function() {
	'use strict';

	/**
	 * Event: Called when extension is installed or updated or Chrome is updated
	 *
	 */
	function onInstalled() {
		// create menus on the right click menu of the extension icon
		chrome.contextMenus.create({type: 'normal', id: 'ENABLE_MENU', title: 'Disable', contexts: ['browser_action']});
		chrome.contextMenus.create({type: 'separator', id: 'SEP_MENU', contexts: ['browser_action']});

		bgUtils.initData(false);
		bgUtils.processState('all');
	}

	/**
	 * Event: Called when Chrome first starts
	 *
	 */
	function onStartup() {
		bgUtils.processState('all');
	}

	/**
	 * Event: Called when user clicks on extension icon
	 *
	 */
	function onIconClicked() {
		bgUtils.showOptionsTab();
	}

	/**
	 * Event: Called when item in local storage changes
	 *
	 * @param {Event} event
	 *
	 */
	function onStorageChanged(event) {
		bgUtils.processState(event.key);
	}

	/**
	 * Event: Called when computer idle state changes
	 *
	 * @param {String} state current state of computer
	 *
	 */
	function onIdleStateChanged(state) {
		if (state === 'idle' && bgUtils.isActive()) {
			bgUtils.displayScreenSaver();
		} else {
			// delay close a little to allow time to process mouse and keyboard
			chrome.alarms.create('close', {when: Date.now() + 250});
		}
	}

	/**
	 * Event: Called when alarm is raised
	 *
	 * @param {Object} alarm chrome.alarms.Alarm
	 *
	 */
	function onAlarm(alarm) {
		switch (alarm.name) {
			case 'activeStart':
				// entering active time range of keep awake
				bgUtils.setActiveState();
				break;
			case 'activeStop':
				// leaving active time range of keep awake
				bgUtils.setInactiveState();
				break;
			case 'updatePhotos':
				// get the latest for the live photo streams
				photoSources.processDaily();
				break;
			case 'close':
				// close screen savers
				bgUtils.closeScreenSavers();
				break;
			case 'setBadgeText':
				// set the icons text
				var text = '';
				if (myUtils.getBool('enabled')) {
					text = bgUtils.isActive() ? '' : 'SLP';
				} else {
					text = myUtils.getBool('keepAwake') ? 'PWR' : 'OFF';
				}
				chrome.browserAction.setBadgeText({text: text});
				break;
			default:
				break;
		}
	}

	/**
	 * Event: Called when chrome menu is clicked
	 *
	 * @param {Object} info
	 *
	 */
	function onMenuClicked(info) {
		if (info.menuItemId === 'ENABLE_MENU') {
			bgUtils.toggleEnabled();
		}
	}

	/**
	 * Event: Called when registered key combination is pressed
	 *
	 * @param {String} cmd
	 *
	 */
	function onKeyCommand(cmd) {
		if (cmd === 'toggle-enabled') {
			bgUtils.toggleEnabled();
		}
	}

	/**
	 * Message: Called when chrome message is sent
	 *
	 * @param {Object} request
	 *
	 */
	function onMessage(request) {
		if (request.message === 'show') {
			bgUtils.displayScreenSaver(true);
		} else if (request.message === 'restoreDefaults') {
			bgUtils.initData(true);
			bgUtils.processState('all');
		}
	}

	// listen for extension install or update
	chrome.runtime.onInstalled.addListener(onInstalled);

	// listen for Chrome starting
	chrome.runtime.onStartup.addListener(onStartup);

	// listen for click on the icon
	chrome.browserAction.onClicked.addListener(onIconClicked);

	// listen for changes to the stored data
	addEventListener('storage', onStorageChanged, false);

	// listen for changes to the idle state of the computer
	chrome.idle.onStateChanged.addListener(onIdleStateChanged);

	// listen for alarms
	chrome.alarms.onAlarm.addListener(onAlarm);

	// listen for request to display preview of screensaver
	chrome.runtime.onMessage.addListener(onMessage);

	// listen for clicks on context menus
	chrome.contextMenus.onClicked.addListener(onMenuClicked);

	// listen for special keyboard commands
	chrome.commands.onCommand.addListener(onKeyCommand);

})();
