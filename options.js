(function () {
"use strict";

var DEFAULT_ROUTE = 'one';

var t = document.querySelector('#t');
var ajax, pages, errDialog;

t.addEventListener('template-bound', function (e) {
	ajax = document.querySelector('#ajax');
	pages = document.querySelector('#pages');
	errDialog = document.querySelector('#error-dialog');
	var keys = document.querySelector('#keys');

	t.dialogText = "";
	t.isDisabled = false;
	t.isGoogleDisabled = false;
	t.waitForLoad=false;

	t.pages = [
		{name: 'Settings',hash: 'one', icon: 'settings', url: '/settings.html'},
		{name: 'Google+ Photo Albums', hash: 'two', icon: 'cloud-queue', url: '/sources.html'},
		{name: 'Preview (click to close)', hash: 'three', icon: 'pageview', url: null},
		{name: 'Information for Nerds', hash: 'four', icon: 'info-outline', url: '/info.html'},
		{ name: 'Request Support / Report Bug', hash: 'five', icon: 'help', url: null },
		{ name: 'Rate This Extension', hash: 'six', icon: 'grade', url: null }
];

	t.albumList = [];

	//persitent list of selected user albums
	t.albumSelections = JSON.parse(localStorage.albumSelections);

	// insert the html for the pages
	for(var i=0;i<t.pages.length;i++) {
		(function (index) {
			t.url = t.pages[index].url;
			if(t.url) {
				ajax.go();
			}
		})(i);
	}

	// Allow selecting pages by num keypad. Dynamically add
	// [1, t.pages.length] to key mappings.
	var keysToAdd = Array.apply(null, t.pages).map(function (x, i) {
		return i + 1;
	}).reduce(function (x, y) {
		return x + ' ' + y;
	});
	keys.keys += ' ' + keysToAdd;

	// Select initial route.
	this.route = this.route || DEFAULT_ROUTE;

});

// handle changes to the enabled state of the screen saver
t.enabledChange = function () {
	var enabledTog = this.$.pages.querySelector('#enabledToggle');
	var label = this.$.pages.querySelector('#enabledLabel');
	var sec = this.$.pages.querySelector('#innerControlsDiv');

	enabledTog.checked ? t.isDisabled = false : t.isDisabled = true;
	enabledTog.checked ? label.textContent = 'Screen Saver On' : label.textContent = 'Screen Saver Off';
	enabledTog.checked ? sec.style.color = 'inherit' : sec.style.color = 'lightgray';
};

// handle changes to the enabled state of the google photo albums
t.useGoogleChange = function () {
	var useGoogleTog = this.$.pages.querySelector('#useGoogleToggle');
	var sec = this.$.pages.querySelector('#innerSourcesDiv');

	useGoogleTog.checked ? t.isGoogleDisabled = false : t.isGoogleDisabled = true;
	useGoogleTog.checked ? sec.style.color = 'inherit' : sec.style.color = 'lightgray';
};

// handle album selections
t.albumSelectChange = function (e) {
	var i;
	var loc = parseInt(e.target.id,10);
	var id = t.albumList[loc].id;
	var type = t.albumList[loc].type;

	if(e.target.checked) {
		gPhotos.loadAlbum(type, id, true, function (photos, error) {
			if(!error) {
				for(i=0; i<t.albumSelections.length; i++) {
					if(t.albumSelections[i].id === id) {
						t.albumSelections.splice(i, 1);
						break;
					}
				}
				t.albumSelections.push({id: id, photos: photos});
				localStorage.albumSelections = JSON.stringify(t.albumSelections);
			}
			else {
				t.dialogText = error;
				errDialog.toggle();
			}
		});
	}
	else {
		for(i=0; i<t.albumSelections.length; i++) {
			if(t.albumSelections[i].id === id) {
				t.albumSelections.splice(i, 1);
				break;
			}
		}
		localStorage.albumSelections = JSON.stringify(t.albumSelections);
	}
};

t.loadAlbumList = function () {
	t.waitForLoad = true;
	gPhotos.loadAlbumList(function (albumList, error) {
		if (!error) {
			t.albumList = albumList;
			t.selectAlbums();
		}
		else {
			t.dialogText = error;
			errDialog.toggle();
		}
		t.waitForLoad = false;
	});
};

// refresh the album list
t.albumRefreshTapped = function () {
	t.loadAlbumList();
};

// deselect all albums
t.albumDeselectAllTapped = function () {
	for (var i = 0; i < t.albumList.length; i++) {
		if(t.albumList[i].checked) {
			t.albumList[i].checked = false;
		}
	}
	t.albumSelections = [];
	localStorage.albumSelections = JSON.stringify(t.albumSelections);
};

// set the checked state of the albums
t.selectAlbums = function () {
	var i,j;
	for(i=0; i< t.albumList.length; i++) {
		for(j=0; j < t.albumSelections.length; j++) {
			if(t.albumList[i].id === t.albumSelections[j].id) {
				t.albumList[i].checked = true;
				break;
			}
		}
	}
};

t.keyHandler = function (e, detail, sender) {
	// Select page by num key.
	var num = parseInt(detail.key, 10);
	if (!isNaN(num) && num <= this.pages.length) {
		pages.selectIndex(num - 1);
		return;
	}

	switch (detail.key) {
		case 'left':
		case 'up':
			pages.selectPrevious();
			break;
		case 'right':
		case 'down':
			pages.selectNext();
			break;
		case 'space':
			detail.shift ? pages.selectPrevious() : pages.selectNext();
			break;
	}
};

// handle page selections
t.menuItemSelected = function (e, detail, sender) {

	if (detail.isSelected) {
		if(detail.item.id === 'menuItem1') {
			t.loadAlbumList();
		}
		else if(detail.item.id === 'menuItem2') {
			localStorage.isPreview = 'true';
			chrome.runtime.getBackgroundPage(function (win) {
				win.showScreenSaver();
			});
		}
		else if (detail.item.id === 'menuItem4') {
			chrome.tabs.create({url: 'https://chrome.google.com/webstore/detail/photo-screen-saver/kohpcmlfdjfdggcjmjhhbcbankgmppgc/support'});
		}
		else if (detail.item.id === 'menuItem5') {
			chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/photo-screen-saver/kohpcmlfdjfdggcjmjhhbcbankgmppgc/reviews' });
		}
}
};

t.ajaxLoad = function (e, detail, sender) {
	e.preventDefault(); // prevent link navigation.
};

// ajax response for pages
t.onResponse = function (e, detail, sender) {
	var item;
	var page = detail.response.getElementById('mainPageDiv');
	if(page) {
		var html = page.innerHTML;

		// TODO gotta be a better way
		if(detail.xhr.responseURL.search(t.pages[0].url) !== -1) {
			item = pages.querySelector('#pageDiv0');
		}
		else if(detail.xhr.responseURL.search(t.pages[1].url) !== -1) {
			item = pages.querySelector('#pageDiv1');

		}
		else if(detail.xhr.responseURL.search(t.pages[3].url) !== -1) {
			item = pages.querySelector('#pageDiv3');

		}

		this.injectBoundHTML(html, item);
	}
};

// ajax error
t.onError = function (e, xhr) {
	console.log(e);
	console.log(xhr);
};

// log pageview to google analytics
ga('send', 'pageview', '/options.html');

})();