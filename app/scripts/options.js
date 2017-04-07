/*
@@license
*/
(function(document) {
	'use strict';

	// path to the extension
	var EXT_URI = 'https://chrome.google.com/webstore/detail/photo-screen-saver/kohpcmlfdjfdggcjmjhhbcbankgmppgc/';

	// auto-binding template
	var t = document.querySelector('#t');

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
	 */
	t.addEventListener('dom-change', function() {
		// listen for app messages
		chrome.runtime.onMessage.addListener(t.onMessage);
	});

	/**
	 * Event Listener for main menu clicks
	 * Route to proper page
	 * @param {Event} event
	 */
	t.onDataRouteClick = function(event) {

		// Close drawer after menu item is selected if drawerPanel is narrow
		t.closeDrawer();

		var index = t.pages.map(function(e) {
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
	 */
	t.googlePhotos = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			t.gPhotosPage = new GooglePhotosPage('gPhotosPage', t.$.errorDialog, t.$.dialogTitle, t.$.dialogText);
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
	 */
	t.faq = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			var el = new FaqPage();
			Polymer.dom(t.$.faqInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Show the Information for Nerds page
	 * @param {Integer} index index into t.pages Array
	 */
	t.info = function(index) {
		if (!t.pages[index].ready) {
			// create the page the first time
			t.pages[index].ready = true;
			var el = new InfoPage();
			Polymer.dom(t.$.infoInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		t.scrollPageToTop();
	};

	/**
	 * Display a preview of the screen saver
	 */
	t.preview = function() {
		// select previous page
		t.async(function() {
			t.$.mainMenu.select(t.prevRoute);
		}, 500);
		chrome.runtime.sendMessage({
			message: 'show'
		}, function(response) {});
	};

	// list of pages
	t.pages = [
		{label: 'Settings', route: 'page-settings', icon: 'settings', obj: null, ready: true},
		{label: 'Google Photos Albums', route: 'page-google-photos', icon: 'cloud', obj: t.googlePhotos, ready: false},
		{label: 'Preview', route: 'page-preview', icon: 'pageview', obj: t.preview, ready: true},
		{label: 'Frequently Asked Questions (FAQ)', route: 'page-faq', icon: 'help', obj: t.faq, ready: false},
		{label: 'Information For Nerds', route: 'page-info', icon: 'info', obj: t.info, ready: false},
		{label: 'Request Support', route: 'page-support', icon: 'help', obj: EXT_URI + 'support', ready: true},
		{label: 'Rate Extension', route: 'page-rate', icon: 'grade', obj: EXT_URI + 'reviews', ready: true}
	];

	/**
	 * Scroll page to top
	 */
	t.scrollPageToTop = function() {
		t.$.scrollPanel.scrollToTop(true);
	};

	/**
	 * Close drawer if drawerPanel is narrow
	 */
	t.closeDrawer = function() {
		var drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	};

	/**
	 * Listen for app messages
	 * @param {JSON} request object
	 * @param {Object} sender MessageSender object
	 * @param {function} response function to callback to sender
	 */
	t.onMessage = function(request, sender, response) {
		if (request.message === 'highlight') {
			// highlight ourselves and let the sender know we are here
			chrome.tabs.getCurrent(function(t) {
				chrome.tabs.update(t.id, {'highlighted': true});
			});
			response(JSON.stringify({message: 'OK'}));
		} else if (request.message === 'storageExceeded') {
			// Display Error Dialog if a save action exceeded the localStorage limit
			t.dialogTitle = 'Exceeded Storage Limits';
			t.dialogText = 'Deselect other photo sources and try again.';
			t.$.errorDialog.open();
		}
	};

})(document);
