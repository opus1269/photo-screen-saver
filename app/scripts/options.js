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
	t.errorDialog;
	t.albumT;

	// Dialog for error messages
	t.errorDialog;
	t.dialogText = '';

	// current and previous route
	// several menu items open a new tab or window and we
	// need to keep the selected menu item and the current page in sync
	t.route = 'page-settings';
	t.prevRoute = 'page-settings';

	// display spinner while performing lengthy operations
	t.waitForLoad = false;

	// array of Google Photos Albums
	t.albums = [];

	// array photo sizing types
	t.photoSizingItems = ['Letterbox','Fill Screen','Center &amp; Frame'];

	// array photo transition types
	t.photoTransitionItems = ['Scale up','Fade','Slide from right','Slide down','Spin up'];

	// array of Flickr search terms
	t.flickrSearchItems = ['None', 'Interesting - daily', 'Favorites'];

	// array of selected google albums
	t.albumSelections = JSON.parse(localStorage.albumSelections);

	// Listen for template bound event to know when bindings
	// have resolved and content has been stamped to the page
	t.addEventListener('dom-change', function() {
		t.menu = t.$.mainMenu;
		t.errorDialog = t.$.errorDialog;
		t.albumT = t.$.albumsTemplate;
		console.log('dom-change', t.errorDialog, t.menu, t.albumT);

	});

	// See https://github.com/Polymer/polymer/issues/1381
	// window.addEventListener('WebComponentsReady', function() {
	//   // imports are loaded and elements have been registered
	//   t.menu = Polymer.dom(document).querySelector('#mainMenu');
	//   t.errorDialog = Polymer.dom(document).querySelector('#errorDialog');
	//   console.log('WebComponentsReady', t.errorDialog, t.menu);
	// });

	// Scroll page to top
	t.scrollPageToTop = function() {
		document.getElementById('mainContainer').scrollTop = 0;
	};

	// Close drawer if drawerPanel is narrow
	t.closeDrawer = function() {
		var drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	};

	// handle menu selection of pages
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

	// Refresh the list of albums
	t.refreshAlbums = function(items) {
		var tmp = [];
		var item;

		for (var i = 0; i < items.length; i++) {
			item = items[i];
			tmp.push({
				checked: item.checked,
				name: item.name
			});
		}
		t.albums = tmp;
	};

	// show the Google Photos page
	t.googlePhotos = function(index) {
		t.route = t.pages[index].route;
		t.loadAlbumList();
	};

	// preview the screensaver
	t.preview = function() {
		t.async(function() {
			t.menu.select(t.prevRoute);
		}, 500);
		// localStorage.isPreview = 'true';
		// chrome.runtime.getBackgroundPage(function(win) {
		// 	win.showScreenSaver();
		// });
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

	// Query Picasa for the list of the users albums
	t.loadAlbumList = function() {
		t.waitForLoad = true;
		gPhotos.loadAlbumList(function(albums, error) {
			//error = 'This is an eror';
			if (!error) {
				t.albums = albums;
				t.selectAlbums();
			} else {
				t.dialogText = error;
				t.errorDialog.open();
			}
			t.waitForLoad = false;
		});
	};

	// set the checked state of the albums (before binding)
	t.selectAlbums = function() {
		var i, j;

		for (i = 0; i < t.albums.length; i++) {
			for (j = 0; j < t.albumSelections.length; j++) {
				if (t.albums[i].id === t.albumSelections[j].id) {
					t.albums[i].checked = true;
					break;
				}
			}
		}
	};

	// refresh the album list
	t.albumRefreshTapped = function() {
		t.loadAlbumList();
	};

	// deselect all albums
	t.albumsDeselectAllTapped = function() {
		var model;

		for (var i = 0; i < t.albums.length; i++) {
			if (t.albums[i].checked) {
				model = t.albumT.modelForElement(document.querySelector('#' + t.albums[i].uid));
				model.set('item.checked', false);
			}
		}
		t.albumSelections = [];
		localStorage.albumSelections = JSON.stringify(t.albumSelections);
	};

	// handle interactive album selections
	t.albumSelectChange = function(event) {
		var item = event.model.item;
		var index = t.albumSelections.map(function(e) {return e.id;}).indexOf(item.id);

		if (index !== -1) {
			t.albumSelections.splice(index, 1);
		}

		if (item.checked) {
			t.albumSelections.push({id: item.id, photos: item.photos});
		}

		localStorage.albumSelections = JSON.stringify(t.albumSelections);
	};

})(document);
