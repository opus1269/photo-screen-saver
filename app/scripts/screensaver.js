(function() {
	'use strict';

	// main auto-bind template
	var t = document.querySelector('#t');

	// repeat template
	t.rep;

	// neon-animated-pages element
	t.p;

	// array of all the photos to use for slide show and an index into it
	t.itemsAll = [];
	t.curIdx = 0;

	// array of TEMP_CT photos currently loaded into the animatable pages
	// always changing subset of itemsAll
	var TEMP_CT = 50;
	t.items = [];

	// set to true after first full page animation
	t.started = false;

	t.addEventListener('dom-change', function() {

		t.rep = t.$.repeatTemplate;
		t.p = t.$.pages;
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
		catch (e) {}

		// load the photos for the slide show
		t.loadImages();

		// this will kick off the slideshow
		this.fire('pages-ready');

	});

	// create the photo label
	t.getPhotoLabel = function(author, type, force) {
		var ret = '';
		var source = '';
		var idx = type.search('User');

		if (!force && !JSON.parse(localStorage.showPhotog) && (idx !== -1)) {
			// don't show label for user photos, if requested
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
		var timeEl = t.p.querySelector('#' + item.timeID);
		var date = new Date();

		var model = t.rep.modelForElement(timeEl);
		if (format === 1) {
			var time = date.toLocaleTimeString(
				'en-us', {hour: 'numeric', minute: '2-digit',  hour12: true});
			if (time.endsWith('M')) {time = time.substring(0, time.length - 3);}
			model.set('item.time', time);
		} else {
			model.set('item.time', date.toLocaleTimeString(navigator.language,
				{hour: 'numeric', minute: '2-digit', hour12: false}));
		}
	};

	// check if a photo would look bad cropped
	t.badAspect = function(aspect) {
		var aspectScreen = screen.width / screen.height;
		var cutoff = 0.5;  // arbitrary

		if (aspect && ((aspect < aspectScreen - cutoff) ||
				(aspect > aspectScreen + cutoff))) {
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

		t.itemsAll = [];
		this.splice('items', 0, t.items.length);

		arr = t.getPhotoArray();

		if (JSON.parse(localStorage.shuffle)) {
			// randomize the order
			myUtils.shuffleArray(arr);
		}

		for (i = 0; i < arr.length; i++) {

			if (skip && (t.sizingType === 'cover') && t.badAspect(arr[i].asp)) {
				// ignore photos that would look bad when cropped
				arr[i].ignore = true;
			}

			if (!arr[i].asp) {
				// well.... don't know, let's guess :)
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
		var author = t.p.querySelector('#' + item.authorID);
		var time = t.p.querySelector('#' + item.timeID);
		var aspect = item.aspectRatio;
		var aspectScreen = screen.width / screen.height;
		var right,bottom;

		if (aspect < aspectScreen) {
			right = (100 - aspect / aspectScreen * 100) / 2;
			author.style.right = (right + 1) + 'vw';
			author.style.bottom = '';
			time.style.right = (right + 1) + 'vw';
			time.style.bottom = '';
		} else {
			bottom = (100 - (aspectScreen / aspect * 100)) / 2;
			author.style.bottom = (bottom + 1) + 'vh';
			author.style.right = '';
			time.style.bottom = (bottom + 3.5) + 'vh';
			time.style.right = '';
		}
	};

	// show photo centered, with padding, border and shadow
	// show it either scaled up or reduced to fit
	t.framePhoto = function(photoID) {
		var padding, border, borderBot;
		var item = t.items[photoID];
		var image = t.p.querySelector('#' + item.name);
		var author = t.p.querySelector('#' + item.authorID);
		var time = t.p.querySelector('#' + item.timeID);
		var img = image.$.img;
		var width, height;
		var frWidth, frHeight;
		var aspect = item.aspectRatio;

		// scale to screen size
		border = screen.height * 0.005;
		borderBot = screen.height * 0.05;
		padding = screen.height * 0.025;

		if (!JSON.parse(localStorage.showPhotog)) {
			// force use of photo label for this view
			var label = t.getPhotoLabel(item.author, item.type, true);
			var model = t.rep.modelForElement(image);
			model.set('item.label', label);
		}

		height = Math.min((screen.width - padding * 2 - border * 2) / aspect,
							screen.height - padding * 2 - border - borderBot);
		width = height * aspect;

		// size with frame
		frWidth = width + border * 2;
		frHeight = height + borderBot + border;

		img.style.height = height + 'px';
		img.style.width = width + 'px';

		image.height = height;
		image.width = width;
		image.style.top = (screen.height - frHeight) / 2 + 'px';
		image.style.left = (screen.width - frWidth) / 2 + 'px';
		image.style.border = 0.5 + 'vh ridge WhiteSmoke';
		image.style.borderRadius = '1.5vh';
		image.style.boxShadow = '1.5vh 1.5vh 1.5vh rgba(0,0,0,.7)';
		image.style.borderBottom = 5 + 'vh solid WhiteSmoke';

		if (parseInt(localStorage.showTime, 10)) {
			author.style.left = (screen.width - frWidth) / 2 + 10 + 'px';
			author.style.textAlign = 'left';
		} else {
			author.style.left = '0';
			author.style.textAlign = 'center';
			author.style.width = screen.width + 'px';
		}
		author.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
		author.style.color = 'black';
		author.style.opacity = 0.9;
		author.style.fontSize = '2.5vh';
		author.style.fontWeight = 300;

		time.style.right = (screen.width - frWidth) / 2 + 10 + 'px';
		time.style.textAlign = 'right';
		time.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
		time.style.color = 'black';
		time.style.opacity = 0.9;
		time.style.fontSize = '2.5vh';
		time.style.fontWeight = 300;

	};

	// try to find a photo that is ready to display
	t.findPhoto = function(photoID) {
		var i, found = false;

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
		var image = t.p.querySelector('#' + t.items[photoID].name);
		return image && image.loaded;
	};

	// called at fixed time intervals to cycle through the pages
	t.nextPhoto = function() {
		var curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
		var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
		var prevPage = curPage ? curPage - 1 : t.items.length - 1;
		var selected = nextPage;

		if (t.started && (t.itemsAll.length > t.items.length)) {
			// splice in the next image at the previous page.
			t.rep.splice('items', prevPage, 1, t.itemsAll[t.curIdx]);
			t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
		}

		if (t.p.selected === undefined) {
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
			t.p.selected = selected;
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
