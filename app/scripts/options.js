/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its contributors
 *  may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 *  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 *  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 *  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 *  OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(document) {
	'use strict';

	/**
	 * Extension's Options page
	 * @namespace Options
	 */

	/**
	 * Path to the extension
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Options
	 */
	const EXT_URI =
		'https://chrome.google.com/webstore/detail/photo-screen-saver/' +
		'kohpcmlfdjfdggcjmjhhbcbankgmppgc/';

	/**
	 * Path to my Pushy Clipboard extension
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Options
	 */
	const PUSHY_URI =
		'https://chrome.google.com/webstore/detail/pushy-clipboard/' +
		'jemdfhaheennfkehopbpkephjlednffd';

	// auto-binding template
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
	 * Event Listener for template bound event to know when bindings
	 * have resolved and content has been stamped to the page
	 * @memberOf Options
	 */
	t.addEventListener('dom-change', function() {
		// listen for app messages
		chrome.runtime.onMessage.addListener(t.onMessage);
	});

	/**
	 * Event Listener for main menu clicks
	 * Route to proper page
	 * @param {Event} event
	 * @memberOf Options
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
	 * @param {Integer} index index into t.pages Array
	 * @memberOf Options
	 */
	t.googlePhotos = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			t.gPhotosPage =
				new GooglePhotosPage('gPhotosPage', t.$.errorDialog,
					t.$.dialogTitle, t.$.dialogText);
			Polymer.dom(t.$.googlePhotosInsertion).appendChild(t.gPhotosPage);
		} else {
			t.gPhotosPage.loadAlbumList();
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Show the FAQ page
	 * @param {Integer} index index into t.pages Array
	 * @memberOf Options
	 */
	t.faq = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			const el = new FaqPage();
			Polymer.dom(t.$.faqInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Show the Information for Nerds page
	 * @param {Integer} index index into t.pages Array
	 * @memberOf Options
	 */
	t.info = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			const el = new InfoPage();
			Polymer.dom(t.$.infoInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Display a preview of the screen saver
	 * @memberOf Options
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
	 * Manage an html page that is inserted on demand<br />
	 * May also be a url link to external site
	 * @typedef page
	 * @type {object}
	 * @property {string} label - label for Nav menu
	 * @property {string} route - element name route to page
	 * @property {string} icon - icon for Nav Menu
	 * @property {object|null} obj - something to be done when selected
	 * @property {boolean} ready - true if html is inserted
	 * @property {boolean} divider - true for divider before item
	 * @memberOf Options
	 */

	/**
	 * Array of pages
	 * @type {Options.page[]}
	 * @memberOf Options
	 */
	t.pages = [
		{
			label: 'Settings', route: 'page-settings',
			icon: 'myicons:settings', obj: null, ready: true, divider: false,
		},
		{
			label: 'Google Photos Albums', route: 'page-google-photos',
			icon: 'myicons:cloud', obj: t.googlePhotos, ready: false,
			divider: false,
		},
		{
			label: 'Preview', route: 'page-preview',
			icon: 'myicons:pageview', obj: t.preview, ready: true,
			divider: false,
		},
		{
			label: 'Frequently Asked Questions (FAQ)', route: 'page-faq',
			icon: 'myicons:help', obj: t.faq, ready: false, divider: false,
		},
		{
			label: 'Information For Nerds', route: 'page-info',
			icon: 'myicons:info', obj: t.info, ready: false, divider: false,
		},
		{
			label: 'Request Support', route: 'page-support',
			icon: 'myicons:help', obj: `${EXT_URI}support`, ready: true,
			divider: true,
		},
		{
			label: 'Rate Extension', route: 'page-rate',
			icon: 'myicons:grade', obj: `${EXT_URI}reviews`, ready: true,
			divider: false,
		},
		{
			label: 'Try Pushy Clipboard', route: 'page-pushy',
			icon: 'myicons:extension', obj: PUSHY_URI, ready: true,
			divider: true,
		},
	];

	/**
	 * Scroll page to top
	 * @memberOf Options
	 */
	t.scrollPageToTop = function() {
		t.$.scrollPanel.scrollToTop(true);
	};

	/**
	 * Close drawer if drawerPanel is narrow
	 * @memberOf Options
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
	 * @param {object} request - details for the message
	 * @param {string} request.message - name of the message
	 * @param {object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @return {boolean} true if asynchronous
	 * @private
	 * @memberOf Options
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
			t.dialogTitle = 'Exceeded Storage Limits';
			t.dialogText = 'Deselect other photo sources and try again.';
			t.$.errorDialog.open();
		}
		return false;
	};
})(document);
