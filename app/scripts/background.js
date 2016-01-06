/*
@@license
*/
(function() {
'use strict';

// event: called when extension is installed or updated or Chrome is updated
function onInstalled() {
	// create menus on the right click menu of the extension icon
	chrome.contextMenus.create({type: 'normal', id: 'ENABLE_MENU', title: 'Disable', contexts: ['browser_action']});
	chrome.contextMenus.create({type: 'normal', id: 'DISPLAY_MENU', title: 'Display screensaver', contexts: ['browser_action']});
	chrome.contextMenus.create({type: 'separator', id: 'SEP_MENU', contexts: ['browser_action']});

	bgUtils.initData();
	bgUtils.processState('all');
}

// event: called when Chrome first starts
function onStartup() {
	bgUtils.processState('all');
}

// event: display or focus options page
function onIconClicked() {
	chrome.tabs.query({title: 'Photo Screen Saver Options Page'}, function(t) {
		if (t.length) {
			chrome.tabs.update(t[0].id, {'highlighted': true});
		} else {
			chrome.tabs.create({url: '../html/options.html'});
		}
	});
}

// event: process the state when someone has changed the storage
function onStorageChanged(event) {
	bgUtils.processState(event.key);
}

// event: add or remove the screensavers as needed
function onIdleStateChanged(state) {
	bgUtils.hasScreenSaverWindow(function(isTrue) {
		if (state === 'idle') {
			if (bgUtils.isActive() && !isTrue) {
				// display if the screensaver is active and none currently exist
				bgUtils.displayScreenSaver();
			}
		} else if (isTrue) {
			chrome.runtime.sendMessage({command: 'close'});
		}
	});
}

// event: alarm triggered
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
			// close screensavers
			bgUtils.closeScreenSavers();
			break;
		case 'setBadgeText':
			// set the icons text
			var text = '';
			if (JSON.parse(localStorage.enabled)) {
				text = bgUtils.isActive() ? '' : 'SLP';
			} else {
				text = JSON.parse(localStorage.keepAwake) ? 'PWR' : 'OFF';
			}
			chrome.browserAction.setBadgeText({text: text});
			break;
		default:
			break;
	}
}

// message: preview the screensaver
function onMessage(request) {
	if (request.command === 'preview') {
		// preview screensaver
		bgUtils.displayScreenSaver(true);
	} else if (request.command === 'close') {
		// close all screensavers
		// delay close a little to allow time to process mouse and keyboard
		chrome.alarms.create('close', {when: Date.now() + 250});
	}
}

// event: context menu clicked
function onMenuClicked(info) {
	if (info.menuItemId === 'ENABLE_MENU') {
		bgUtils.toggleEnabled();
	} else if (info.menuItemId === 'DISPLAY_MENU') {
		bgUtils.displayScreenSaver();
	}
}

// event: keyboard shortcut
function onKeyCommand(cmd) {
	if (cmd === 'toggle-enabled') {
		bgUtils.toggleEnabled();
	} else if (cmd === 'display-screensaver') {
		bgUtils.displayScreenSaver();
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

// listen for the keep wake change alarms
chrome.alarms.onAlarm.addListener(onAlarm);

// listen for request to display preview of screensaver
chrome.runtime.onMessage.addListener(onMessage);

// listen for clicks on context menus
chrome.contextMenus.onClicked.addListener(onMenuClicked);

// listen for special keyboard commands
chrome.commands.onCommand.addListener(onKeyCommand);
})();
