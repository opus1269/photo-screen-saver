(function() {
	'use strict';

	// main template and pages repeat temple
	var t = document.querySelector('#t');
	var tPages;

	// array of all the photos to use for slide show
	t.itemsAll = [];

	// current index into itemsAll;
	t.curIdx = 0;

	// array of TEMP_CT photos currently loaded into the animatable pages
	// always changing subset of itemsAll
	var TEMP_CT = 50;
	t.items = [];

	// set to true after first full page animation
	t.started = false;

	t.addEventListener('dom-change', function() {

		tPages = document.querySelector('#repeatTemplate');

		t.transitionType = parseInt(localStorage.photoTransition,10);
		t.transitionTime = parseInt(localStorage.transitionTime,10) * 1000;
		t.waitTime = t.transitionTime;
		switch (parseInt(localStorage.photoSizing,10)) {
			case 0:
				t.sizingType = 'contain';
				break;
			case 1:
				t.sizingType = 'cover';
				break;
			case 2:
				t.sizingType = null;
				break;
		}

		// override zoom factor - chrome 42 and later
		try {
			chrome.tabs.getZoom(function(zoomFactor) {
				if ((zoomFactor < 0.99) || (zoomFactor > 1.01)) {
					chrome.tabs.setZoom(1.0);
				}
			});
		}
		catch (err) {}

		// load the photos for the slide show
		t.loadImages();

		// this will kick off the slideshow
		this.fire('pages-ready');

	});

	// Fisher-Yates shuffle algorithm.
	t.shuffleArray = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	};

	// create the photo label
	t.getPhotoLabel = function(author, type, force) {
		var ret = '';
		var source = '';
		var idx = type.search('User');

		if (!force && !JSON.parse(localStorage.showPhotog) && (idx !== -1)) {
			// don't show label for user photos
			return ret;
		}
		if (type) {
			if (idx !== -1) {
				type = type.substring(0, idx - 1); // strip off 'User'
			}
			source = ' / ' + type ;
		}
		if (author) {
			ret = author + source;
		} else if (source) {
			ret = 'Photo from ' + source.substring(3);
		}
		return ret;
	};

	// set the time label
	t.setTime = function(photoID) {
		var format = parseInt(localStorage.showTime, 10);
		if (!format) {
			return;
		}
		var item = t.items[photoID];
		var p = t.$.pages;
		var timeEl = p.querySelector('#' + item.timeID);
		var date = new Date();

		var model = tPages.modelForElement(timeEl);
		if (format === 1) {
			model.set('item.time', date.toLocaleTimeString(navigator.language,
				{hour: 'numeric', minute: '2-digit',  hour12: true}));
		} else {
			model.set('item.time', date.toLocaleTimeString(navigator.language,
				{hour: 'numeric', minute: '2-digit', hour12: false}));
		}
	};

	// check if a photo would look bad cropped
	t.badAspect = function(aspectRatio) {
		var aspectRatioScreen = screen.width / screen.height;
		var cutoff = 0.5;  // arbitrary

		if (aspectRatio && ((aspectRatio < aspectRatioScreen - cutoff) ||
				(aspectRatio > aspectRatioScreen + cutoff))) {
			return true;
		}
		return false;
	};

	// add a type identifying the source of a photo
	t.addType = function(arr, type) {
		for (var i = 0; i < arr.length; i++) {
			arr[i].type = type;
		}
	};

	// prepare the array of photos the user has selected
	t.getPhotoArray = function() {
		var arr = [];
		var tmp = [];

		if (JSON.parse(localStorage.useGoogle)) {
			var albumSelections = JSON.parse(localStorage.albumSelections);
			for (var i = 0; i < albumSelections.length; i++) {
				tmp = []; tmp = albumSelections[i].photos;
				t.addType(tmp, 'Google User');
				arr = arr.concat(tmp);
			}
		}
		if (JSON.parse(localStorage.useChromecast)) {
			tmp = []; tmp = JSON.parse(localStorage.ccImages);
			t.addType(tmp, 'Google');
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.usePopular500px)) {
			tmp = []; tmp = JSON.parse(localStorage.popular500pxImages);
			t.addType(tmp, '500px');
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.useInterestingFlickr)) {
			tmp = []; tmp = JSON.parse(localStorage.flickrInterestingImages);
			t.addType(tmp, 'flickr');
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.useFavoriteFlickr)) {
			tmp = []; tmp = JSON.parse(localStorage.flickrFavoriteImages);
			t.addType(tmp, 'flickr');
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.useAuthors)) {
			tmp = []; tmp = JSON.parse(localStorage.authorImages);
			t.addType(tmp, 'Google');
			arr = arr.concat(tmp);
		}

		return arr;
	};

	// perform final processing on the selected photo sources and
	// populate the pages
	t.loadImages = function() {
		var i,count = 0;
		var author;
		var photoLabel;
		var skip = JSON.parse(localStorage.skip);
		var arr = [];

		this.splice('itemsAll', 0, t.itemsAll.length);
		this.splice('items', 0, t.items.length);

		arr = t.getPhotoArray();

		// randomize the order
		if (JSON.parse(localStorage.shuffle)) {
			t.shuffleArray(arr);
		}

		for (i = 0; i < arr.length; i++) {

			// ignore photos that would look bad when cropped
			if (skip && (t.sizingType === 'cover') && t.badAspect(arr[i].asp)) {
				arr[i].ignore = true;
			}

			// well.... don't know, let's guess :)
			if (!arr[i].asp) {
				arr[i].asp = 16 / 9;
			}

			if (!arr[i].ignore) {

				arr[i].author ? author = arr[i].author : author = '';
				photoLabel = t.getPhotoLabel(author, arr[i].type);

				t.itemsAll.push({name: 'image' + (count + 1),
									path: arr[i].url,
									authorID: 'author' + (count + 1),
									author: author,
									type: arr[i].type,
									label: photoLabel,
									timeID: 'time' + (count + 1),
									time: '',
									sizingType: t.sizingType,
									aspectRatio: arr[i].asp,
									width: screen.width,
									height: screen.height
				});
				if (count < TEMP_CT) {
					// the Polymer way - !important
					t.push('items', t.itemsAll[count]);
					t.curIdx++;
				}
				count++;
			}
		}

		if (!count) {
			// no photos to show
			var err = document.querySelector('#noPhotos');
			err.style.visibility = 'visible';
		}

	};

	// position the text when using Letterbox
	t.posText = function(photoID) {
		var item = t.items[photoID];
		var aspectRatio = item.aspectRatio;
		var author = t.$.pages.querySelector('#' + item.authorID);
		var time = t.$.pages.querySelector('#' + item.timeID);
		var screenAspectRatio = screen.width / screen.height;
		var right,bottom;

		if (aspectRatio < screenAspectRatio) {
			right = (screen.width - (screen.height * aspectRatio)) / 2;
			author.style.right = (right + 30) + 'px';
			author.style.bottom = '';
			time.style.right = (right + 30) + 'px';
			time.style.bottom = '';
		} else {
			bottom = (screen.height - (screen.width / aspectRatio)) / 2;
			author.style.bottom = (bottom + 20) + 'px';
			author.style.right = '';
			time.style.bottom = (bottom + 50) + 'px';
			time.style.right = '';
		}
	};

	// show photo centered, with padding, border and shadow
	// show it either scaled up or reduced to fit
	t.framePhoto = function(photoID) {
		var padding = 30,border = 5,borderBot = 50;
		var item = t.items[photoID];
		var p = t.$.pages;
		var image = p.querySelector('#' + item.name);
		var author = p.querySelector('#' + item.authorID);
		var time = p.querySelector('#' + item.timeID);
		var img = image.$.img;
		var width, height;
		var aspectRatio = item.aspectRatio;

		// force use of photo label for this view
		if (!JSON.parse(localStorage.showPhotog)) {
			var label = t.getPhotoLabel(item.author, item.type, true);
			var model = tPages.modelForElement(image);
			model.set('item.label', label);
		}

		height = Math.min((screen.width - padding * 2 - border * 2) / aspectRatio,
							screen.height - padding * 2 - border - borderBot);
		width = height * aspectRatio;

		img.style.height = height + 'px';
		img.style.width = width + 'px';

		image.height = height;
		image.width = width;
		image.style.top = (screen.height - height - borderBot - border) / 2 + 'px';
		image.style.left = (screen.width - width) / 2 + 'px';
		image.style.border = border + 'px ridge WhiteSmoke';
		image.style.borderRadius = '15px';
		image.style.boxShadow = '15px 15px 15px rgba(0,0,0,.7)';
		image.style.borderBottom = borderBot + 'px solid WhiteSmoke';

		if (parseInt(localStorage.showTime, 10)) {
			author.style.left = (screen.width - width) / 2 + 10 + 'px';
			author.style.textAlign = 'left';
		} else {
			author.style.left = '0px';
			author.style.textAlign = 'center';
			author.style.width = screen.width + 'px';
		}
		author.style.bottom = (screen.height - height - borderBot - border + 20) / 2 + 'px';
		author.style.color = 'black';
		author.style.opacity = 1;

		time.style.right = (screen.width - width) / 2 + 10 + 'px';
		time.style.textAlign = 'right';
		time.style.bottom = (screen.height - height - borderBot - border + 20) / 2 + 'px';
		time.style.color = 'black';
		time.style.opacity = 1;
		time.style.fontSize = '28px';
		time.style.fontWeight = 400;

	};

	// try to find a photo that is ready to display
	t.findPhoto = function(photoID) {
		var i;
		var found = false;

		for (i = photoID + 1; i < t.items.length; i++) {
			if (t.isComplete(i)) {
				found = true;
				photoID = i;
				break;
			}
		}
		if (!found) {
			for (i = 0; i < photoID; i++) {
				if (t.isComplete(i)) {
					photoID = i;
					found = true;
					break;
				}
			}
		}
		return photoID;
	};

	// check if the photo is ready to display
	t.isComplete = function(photoID) {
		var item = t.items[photoID];
		var image = t.$.pages.querySelector('#' + item.name);

		return image.loaded;
	};

	// called at fixed time intervals to cycle through the pages
	t.nextPhoto = function() {
		var p = t.$.pages;
		var curPage = (p.selected === undefined) ? 0 : p.selected;
		var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
		var prevPage = curPage ? curPage - 1 : t.items.length - 1;
		var selected = nextPage;

		if (t.started && (t.itemsAll.length > t.items.length)) {
			// splice in the next image at the previous page.
			tPages.splice('items', prevPage, 1, t.itemsAll[t.curIdx]);
			t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
		}

		if (p.selected === undefined) {
			// special case for first page. neon-animated-pages is configured
			// to run the entry animation for the first selection
			selected = curPage;
		}	else if (!t.started) {
			// first full animation will run. next time ready to start
			// splicing in the new images
			t.started = true;
		}

		if (!t.isComplete(selected)) {
			// try to find a photo that is loaded
			selected = t.findPhoto(selected);
		}

		if (!t.isComplete(selected)) {
			// photo's not ready.. wait for it
			// set the waitTime in the setTimeout function so we don't have to
			// wait for the whole slide transition time to try again
			t.waitTime = 1000;
		} else {
			// set the waitTime back to transition time in case it was changed
			if (t.waitTime !== t.transitionTime) {
				t.waitTime = t.transitionTime;
			}

			// prep photos
			t.setTime(selected);
			if (!t.sizingType) {
				t.framePhoto(selected);
			} else if (t.sizingType === 'contain') {
				t.posText(selected);
			}

			// set the selected so the animation runs
			p.selected = selected;
		}

		// setup the next timer --- runs forever
		t.timer = window.setTimeout(t.nextPhoto, t.waitTime);
	};

	// This will run to infinity... and beyond
	// each call to t.nextPhoto will set another timeout
	t.addEventListener('pages-ready', function() {
		t.waitTime = 2000;
		t.timer = window.setTimeout(t.nextPhoto, t.waitTime);
	});

	// close preview window on click
	window.addEventListener('click', function() {
		window.close();
	}, false);

})();
