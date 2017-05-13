/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function(document) {
	'use strict';

	/**
	 * Extension's Options page
	 * @namespace app.Options
	 */

	/**
	 * Manage an html page that is inserted on demand<br />
	 * May also be a url link to external site
	 * @typedef {Object} app.Options.Page
	 * @property {string} label - label for Nav menu
	 * @property {string} route - element name route to page
	 * @property {string} icon - icon for Nav Menu
	 * @property {?Object} obj - something to be done when selected
	 * @property {boolean} ready - true if html is inserted
	 * @property {boolean} divider - true for divider before item
	 * @memberOf app.Options
	 */

	/**
	 * Path to the extension in the Web Store
	 * @type {string}
	 * @const
	 * @private
	 * @memberOf app.Options
	 */
	const EXT_URI =
		'https://chrome.google.com/webstore/detail/photo-screen-saver/' +
		chrome.runtime.id + '/';

	/**
	 * Path to my Pushy Clipboard extension
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Options
	 */
	const PUSHY_URI =
		'https://chrome.google.com/webstore/detail/pushy-clipboard/' +
		'jemdfhaheennfkehopbpkephjlednffd';

	/**
	 * auto-binding template
	 * @type {Object}
	 * @const
	 * @private
	 * @memberOf app.Options
	 */
	const t = document.querySelector('#t');

	// Error dialog
	t.dialogTitle = '';
	t.dialogText = '';

	// current and previous route
	// several menu items open a new tab or window and we
	// need to keep the selected menu item and the current page in sync
	t.route = 'page-settings';
	t.prevRoute = 'page-settings';

	/**
	 * Computed property: Page title
	 * @returns {string} i18n title
	 * @memberOf app.Options
	 */
	t.computeTitle = function() {
		return app.Utils.localize('chrome_extension_name');
	};

	/**
	 * Computed property: Menu label
	 * @returns {string} i18n label
	 * @memberOf app.Options
	 */
	t.computeMenu = function() {
		return app.Utils.localize('menu');
	};

	/**
	 * Event Listener for template bound event to know when bindings
	 * have resolved and content has been stamped to the page
	 * @memberOf app.Options
	 */
	t.addEventListener('dom-change', function() {
		// listen for app messages
		chrome.runtime.onMessage.addListener(t.onMessage);
	});

	/**
	 * Event Listener for main menu clicks
	 * Route to proper page
	 * @param {Event} event - ClickEvent
	 * @memberOf app.Options
	 */
	t.onDataRouteClick = function(event) {
		// Close drawer after menu item is selected if drawerPanel is narrow
		t.closeDrawer();

		const index = t.pages.map(function(e) {
			return e.route;
		}).indexOf(event.currentTarget.id);

		t.prevRoute = t.route;

		if (!t.pages[index].obj) {
			// some pages are just pages
			t.route = t.pages[index].route;
			t.scrollPageToTop();
		} else if (typeof t.pages[index].obj === 'string') {
			// some pages are url links
			t.$.mainMenu.select(t.prevRoute);
			chrome.tabs.create({url: t.pages[index].obj});
		} else {
			// some pages have functions to view them
			t.pages[index].obj(index, event);
		}
	};

	/**
	 * Show the Google Photos page
	 * @param {int} index index into [t.pages]{@link app.Options.t.pages}
	 * @memberOf app.Options
	 */
	t.googlePhotos = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			t.gPhotosPage =
				new app.GooglePhotosPage('gPhotosPage', t.$.errorDialog,
					t.$.dialogTitle, t.$.dialogText);
			Polymer.dom(t.$.googlePhotosInsertion).appendChild(t.gPhotosPage);
		} else {
			t.gPhotosPage.loadAlbumList();
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Show the help page
	 * @param {int} index - index into [t.pages]{@link app.Options.t.pages}
	 * @private
	 * @memberOf app.Options
	 */
	function _showHelpPage(index) {
		if (!t.pages[index].ready) {
			// insert the page the first time
			t.pages[index].ready = true;
			const el = new app.HelpPageFactory();
			Polymer.dom(t.$.helpInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	}

	/**
	 * Show the Help page
	 * @param {int} index - index into [t.pages]{@link app.Options.t.pages}
	 * @memberOf app.Options
	 */
	t.help = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			const el = new app.HelpPage();
			Polymer.dom(t.$.infoInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Display a preview of the screen saver
	 * @memberOf app.Options
	 */
	t.preview = function() {
		// reselect previous page
		t.async(function() {
			t.$.mainMenu.select(t.prevRoute);
		}, 500);
		chrome.runtime.sendMessage({
			message: 'showScreensaver',
		}, function() {});
	};

	/**
	 * Array of pages
	 * @type {app.Options.Page[]}
	 * @memberOf app.Options
	 */
	t.pages = [
		{
			label: app.Utils.localize('menu_settings'), route: 'page-settings',
			icon: 'myicons:settings', obj: null, ready: true, divider: false,
		},
		{
			label: app.Utils.localize('menu_google'),
			route: 'page-google-photos', icon: 'myicons:cloud',
			obj: t.googlePhotos, ready: false, divider: false,
		},
		{
			label: app.Utils.localize('menu_preview'), route: 'page-preview',
			icon: 'myicons:pageview', obj: t.preview, ready: true,
			divider: false,
		},
		{
			label: app.Utils.localize('menu_help'), route: 'page-help',
			icon: 'myicons:help', obj: _showHelpPage, ready: false,
			divider: false,
		},
		{
			label: app.Utils.localize('menu_support'), route: 'page-support',
			icon: 'myicons:help', obj: `${EXT_URI}support`, ready: true,
			divider: true,
		},
		{
			label: app.Utils.localize('menu_rate'), route: 'page-rate',
			icon: 'myicons:grade', obj: `${EXT_URI}reviews`, ready: true,
			divider: false,
		},
		{
			label: app.Utils.localize('menu_pushy'), route: 'page-pushy',
			icon: 'myicons:extension', obj: PUSHY_URI, ready: true,
			divider: true,
		},
	];

	/**
	 * Scroll page to top
	 * @memberOf app.Options
	 */
	t.scrollPageToTop = function() {
		t.$.scrollPanel.scrollToTop(true);
	};

	/**
	 * Close drawer if drawerPanel is narrow
	 * @memberOf app.Options
	 */
	t.closeDrawer = function() {
		const drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	};

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
	 * @memberOf app.Options
	 */
	t.onMessage = function(request, sender, response) {
		if (request.message === 'highlight') {
			// highlight ourselves and let the sender know we are here
			chrome.tabs.getCurrent(function(t) {
				chrome.tabs.update(t.id, {'highlighted': true});
			});
			response(JSON.stringify({message: 'OK'}));
		} else if (request.message === 'storageExceeded') {
			// Display Error Dialog if a save action exceeded the
			// localStorage limit
			t.dialogTitle = app.Utils.localize('err_storage_title');
			t.dialogText = app.Utils.localize('err_storage_desc');
			t.$.errorDialog.open();
		}
		return false;
	};
})(document);
