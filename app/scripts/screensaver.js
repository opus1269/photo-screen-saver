(function() {
'use strict';

var SCREEN_ASPECT = screen.width / screen.height;

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

// Listen for template bound event to know when bindings
// have resolved and content has been stamped to the page
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
t.setTime = function(idx) {
	var format = parseInt(localStorage.showTime, 10);
	if (!format) {
		return;
	}
	var item = t.items[idx];
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
	var CUT_OFF = 0.5;  // arbitrary

	if (aspect && ((aspect < SCREEN_ASPECT - CUT_OFF) ||
		(aspect > SCREEN_ASPECT + CUT_OFF))) {
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

// get an array of photos from localStorage
t.getPhotos = function(use, name, type, isArray) {
	var ret = [];
	if (isArray) {
		if (JSON.parse(localStorage.getItem(use))) {
			var items = JSON.parse(localStorage.getItem(name));
			for (var i = 0; i < items.length; i++) {
				ret = ret.concat(items[i].photos);
				if (ret) {t.addType(ret, type);}
			}
		}
	} else {
		if (JSON.parse(localStorage.getItem(use))) {
			ret = JSON.parse(localStorage.getItem(name));
			if (ret) {t.addType(ret, type);}
		}
	}
	return ret;
};

// build the array of all selected photos
t.getPhotoArray = function() {
	var arr = [];

	arr = arr.concat(t.getPhotos('useGoogle', 'albumSelections','Google User', true));
	arr = arr.concat(t.getPhotos('useChromecast', 'ccImages','Google'));
	arr = arr.concat(t.getPhotos('usePopular500px', 'popular500pxImages','500'));
	arr = arr.concat(t.getPhotos('useInterestingFlickr', 'flickrInterestingImages','flickr'));
	arr = arr.concat(t.getPhotos('useFavoriteFlickr', 'flickrFavoriteImages','flickr'));
	arr = arr.concat(t.getPhotos('useAuthors', 'authorImages','Google'));

	return arr;
};

// perform final processing on the selected photo sources and
// populate the pages
t.loadImages = function() {
	var i, count = 0;
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

			t.itemsAll.push({
				name: 'image' + (count + 1),
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
t.posText = function(idx) {
	var item = t.items[idx];
	var author = t.p.querySelector('#' + item.authorID);
	var time = t.p.querySelector('#' + item.timeID);
	var aspect = item.aspectRatio;
	var right,bottom;

	if (aspect < SCREEN_ASPECT) {
		right = (100 - aspect / SCREEN_ASPECT * 100) / 2;
		author.style.right = (right + 1) + 'vw';
		author.style.bottom = '';
		time.style.right = (right + 1) + 'vw';
		time.style.bottom = '';
	} else {
		bottom = (100 - (SCREEN_ASPECT / aspect * 100)) / 2;
		author.style.bottom = (bottom + 1) + 'vh';
		author.style.right = '';
		time.style.bottom = (bottom + 3.5) + 'vh';
		time.style.right = '';
	}
};

// show photo centered, with padding, border and shadow
// show it either scaled up or reduced to fit
t.framePhoto = function(idx) {
	var padding, border, borderBot;
	var item = t.items[idx];
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

	// size with the frame
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

// check if the photo is ready to display
t.isReady = function(idx) {
	var image = t.p.querySelector('#' + t.items[idx].name);
	return image && image.loaded;
};

// try to find a photo that is ready to display
t.findLoadedPhoto = function(idx) {
	if (t.isReady(idx)) {return idx;}

	for (var i = idx + 1; i < t.items.length; i++) {
		if (t.isReady(i)) {return i;}
	}
	for (i = 0; i < idx; i++) {
		if (t.isReady(i)) {return i;}
	}
	return -1;
};

// splice in the next image at the previous page.
t.replaceLastPhoto = function(idx) {
	if (t.started && (t.itemsAll.length > t.items.length)) {
		// splice in the next image at the previous page.
		t.rep.splice('items', idx, 1, t.itemsAll[t.curIdx]);
		t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
	}
};

// superscript 500px
t.super500px = function(idx) {
	var item = t.items[idx];
	var author = t.p.querySelector('#' + item.authorID);
	var sup = author.querySelector('#sup');

	if (item.type !== '500') {
		sup.textContent = '';
	} else {
		sup.textContent = 'px';
	}
};

// final prep before display
t.prepPhoto = function(idx) {
	t.setTime(idx);
	t.super500px(idx);
	if (!t.sizingType) {
		t.framePhoto(idx);
	} else if (t.sizingType === 'contain') {
		t.posText(idx);
	}
};

// get the next photo to display
t.getNextPhoto = function(idx) {
	var ret = t.findLoadedPhoto(idx);
	if (ret === -1) {
		// no photos ready.. wait a second and try again
		t.waitTime = 1000;
		ret = -1;
	} else if (t.waitTime !== t.transitionTime) {
		// photo found, set the waitTime back to transition time in case it was changed
		t.waitTime = t.transitionTime;
	}
	return ret;
};

// called at fixed time intervals to cycle through the pages
t.nextPhoto = function() {
	var curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
	var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
	var prevPage = curPage ? curPage - 1 : t.items.length - 1;
	var selected = nextPage;

	// replace the  photo that just ran with the next one
	t.replaceLastPhoto(prevPage);

	if (t.p.selected === undefined) {
		// special case for first page. neon-animated-pages is configured
		// to run the entry animation for the first selection
		selected = curPage;
	}	else if (!t.started) {
		// special case for first full animation. next time ready to start
		// splicing in the new images
		t.started = true;
	}

	selected = t.getNextPhoto(selected);
	if (selected !== -1) {

		t.prepPhoto(selected);

		// set the next selected so the animation runs
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
