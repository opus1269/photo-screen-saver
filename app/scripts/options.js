(function(document) {
	'use strict';

	// path to the extension
	var EXT_URI = 'https://chrome.google.com/webstore/detail/photo-screen-saver/kohpcmlfdjfdggcjmjhhbcbankgmppgc/';

	// Grab a reference to our auto-binding template
	// and give it some initial binding values
	// Learn more about auto-binding templates at http://goo.gl/Dx1u2g
	var t = document.querySelector('#t');

	// grap a few other convenient references
	t.menu;
	t.gPhotosPage;

	// current and previous route
	// several menu items open a new tab or window and we
	// need to keep the selected menu item and the current page in sync
	t.route = 'page-settings';
	t.prevRoute = 'page-settings';

	// Listen for template bound event to know when bindings
	// have resolved and content has been stamped to the page
	t.addEventListener('dom-change', function() {
		t.menu = t.$.mainMenu;
		t.gPhotosPage = t.$.gPhotosPage;
		console.log('dom-change', t.menu, t.gPhotosPage);
	});

	// See https://github.com/Polymer/polymer/issues/1381
	// window.addEventListener('WebComponentsReady', function() {
	//   // imports are loaded and elements have been registered
	//   t.menu = Polymer.dom(document).querySelector('#mainMenu');
	//   t.errorDialog = Polymer.dom(document).querySelector('#errorDialog');
	//   console.log('WebComponentsReady', t.errorDialog, t.menu);
	// });

	// handle main menu selections
	t.onDataRouteClick = function(event) {

		// Close drawer after menu item is selected if drawerPanel is narrow
		t.closeDrawer();

		var index = t.pages.map(function(e) {return e.route;}).indexOf(event.srcElement.id);

		t.prevRoute = t.route;

		if (Boolean(t.pages[index].obj)) {
			if (typeof t.pages[index].obj === 'string') {
				// some pages are url links
				t.menu.select(t.prevRoute);
				chrome.tabs.create({url: t.pages[index].obj});
			} else {
				t.pages[index].obj(index,event);
			}
		} else {
			t.route = t.pages[index].route;
			this.debounce('job1', function() {
				t.scrollPageToTop();
				this.fire('done');
			}, 500);
		}
	};

	// show the Google Photos page
	t.googlePhotos = function(index) {
		t.route = t.pages[index].route;
		t.gPhotosPage.loadAlbumList();
	};

	// preview the screensaver
	t.preview = function() {
		t.async(function() {
			t.menu.select(t.prevRoute);
		}, 500);
		chrome.runtime.sendMessage({preview: 'show'});
	};

	// list of pages
	t.pages = [
		{label: 'Settings', route: 'page-settings', icon: 'settings', obj: null},
		{label: 'Google Photos Albums', route: 'page-google-photos', icon: 'cloud', obj: t.googlePhotos},
		{label: 'Preview (click to close)', route: 'page-preview', icon: 'pageview', obj: t.preview},
		{label: 'Information For Nerds', route: 'page-info', icon: 'info', obj: null},
		{label: 'Request Support', route: 'page-support', icon: 'help', obj: EXT_URI + 'support'},
		{label: 'Rate Extension', route: 'page-rate', icon: 'grade', obj: EXT_URI + 'reviews'}
	];

	// Scroll page to top
	t.scrollPageToTop = function() {
		document.getElementById('scrollPanel').scrollToTop();
	};

	// Close drawer if drawerPanel is narrow
	t.closeDrawer = function() {
		var drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	};

})(document);
