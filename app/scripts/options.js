(function(document) {
	'use strict';

	// path to the extension
	var EXT_URI = 'https://chrome.google.com/webstore/detail/photo-screen-saver/kohpcmlfdjfdggcjmjhhbcbankgmppgc/';

	// Grab a reference to our auto-binding template
	// and give it some initial binding values
	// Learn more about auto-binding templates at http://goo.gl/Dx1u2g
	var app = document.querySelector('#app');

	// grap a few other convenient references
	app.menu;
	app.errorDialog;
	app.albumT;

	// Dialog for error messages
	app.errorDialog;
	app.dialogText = '';

	// current and previous route
	// several menu items open a new tab or window and we
	// need to keep the selected menu item and the current page in sync
	app.route = 'page-settings';
	app.prevRoute = 'page-settings';

	// display spinner while performing lengthy operations
	app.waitForLoad = false;

	// array of Google Photos Albums
	app.albums = [];

	// array of selected google albums
	app.albumSelections = JSON.parse(localStorage.albumSelections);

	// Listen for template bound event to know when bindings
	// have resolved and content has been stamped to the page
	app.addEventListener('dom-change', function() {
		app.menu = app.$.mainMenu;
		app.errorDialog = app.$.errorDialog;
		app.albumT = app.$.albumsTemplate;
		console.log('dom-change', app.errorDialog, app.menu, app.albumT);
	});

	// See https://github.com/Polymer/polymer/issues/1381
	// window.addEventListener('WebComponentsReady', function() {
	//   // imports are loaded and elements have been registered
	//   app.menu = Polymer.dom(document).querySelector('#mainMenu');
	//   app.errorDialog = Polymer.dom(document).querySelector('#errorDialog');
	//   console.log('WebComponentsReady', app.errorDialog, app.menu);
	// });

	// Scroll page to top
	app.scrollPageToTop = function() {
		document.getElementById('mainContainer').scrollTop = 0;
	};

	// Close drawer if drawerPanel is narrow
	app.closeDrawer = function() {
		var drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	};

	// handle menu selection of pages
	app.onDataRouteClick = function(event) {

		// Close drawer after menu item is selected if drawerPanel is narrow
		app.closeDrawer();

		var index = app.pages.map(function(e) {return e.route;}).indexOf(event.srcElement.id);

		app.prevRoute = app.route;

		if (Boolean(app.pages[index].obj)) {
			if (typeof app.pages[index].obj === 'string') {
				// some pages are url links
				app.menu.select(app.prevRoute);
				chrome.tabs.create({url: app.pages[index].obj});
			} else {
				app.pages[index].obj(index,event);
			}
		} else {
			app.route = app.pages[index].route;
			this.debounce('job1', function() {
				app.scrollPageToTop();
				this.fire('done');
			}, 500);
		}
	};

	// Refresh the list of albums
	app.refreshAlbums = function(items) {
		var tmp = [];
		var item;

		for (var i = 0; i < items.length; i++) {
			item = items[i];
			tmp.push({
				checked: item.checked,
				name: item.name
			});
		}
		app.albums = tmp;
	};

	// show the Google Photos page
	app.googlePhotos = function(index) {
		app.route = app.pages[index].route;
		app.loadAlbumList();
	};

	// preview the screensaver
	app.preview = function() {
		app.async(function() {
			app.menu.select(app.prevRoute);
		}, 500);
		localStorage.isPreview = 'true';
		chrome.runtime.getBackgroundPage(function(win) {
			win.showScreenSaver();
		});
	};

	// list of pages
	app.pages = [
		{label: 'Settings', route: 'page-settings', icon: 'settings', obj: null},
		{label: 'Google Photos Albums', route: 'page-google-photos', icon: 'cloud', obj: app.googlePhotos},
		{label: 'Local Photos', route: 'page-local-photos', icon: 'folder', obj: null},
		{label: 'Preview (click to close)', route: 'page-preview', icon: 'pageview', obj: app.preview},
		{label: 'Information For Nerds', route: 'page-info', icon: 'info', obj: null},
		{label: 'Request Support', route: 'page-support', icon: 'help', obj: EXT_URI + 'support'},
		{label: 'Rate Extension', route: 'page-rate', icon: 'grade', obj: EXT_URI + 'reviews'}
	];

	// Query Picasa for the list of the users albums
	app.loadAlbumList = function() {
		app.waitForLoad = true;
		gPhotos.loadAlbumList(function(albums, error) {
			//error = 'This is an eror';
			if (!error) {
				app.albums = albums;
				app.selectAlbums();
			} else {
				app.dialogText = error;
				app.errorDialog.open();
			}
			app.waitForLoad = false;
		});
	};

	// set the checked state of the albums (before binding)
	app.selectAlbums = function() {
		var i, j;

		for (i = 0; i < app.albums.length; i++) {
			for (j = 0; j < app.albumSelections.length; j++) {
				if (app.albums[i].id === app.albumSelections[j].id) {
					app.albums[i].checked = true;
					break;
				}
			}
		}
	};

	// refresh the album list
	app.albumRefreshTapped = function() {
		app.loadAlbumList();
	};

	// deselect all albums
	app.albumsDeselectAllTapped = function() {
		var model;

		for (var i = 0; i < app.albums.length; i++) {
			if (app.albums[i].checked) {
				model = app.albumT.modelForElement(document.querySelector('#' + app.albums[i].uid));
				model.set('item.checked', false);
			}
		}
		app.albumSelections = [];
		localStorage.albumSelections = JSON.stringify(app.albumSelections);
	};

	// handle interactive album selections
	app.albumSelectChange = function(event) {
		var item = event.model.item;
		var index = app.albumSelections.map(function(e) {return e.id;}).indexOf(item.id);

		if (index !== -1) {
			app.albumSelections.splice(index, 1);
		}

		if (item.checked) {
			app.albumSelections.push({id: item.id, photos: item.photos});
		}

		localStorage.albumSelections = JSON.stringify(app.albumSelections);
	};

})(document);
