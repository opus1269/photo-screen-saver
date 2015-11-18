/*
@@license
*/
(function() {
'use strict';

// aspect ratio of screen
var SCREEN_ASPECT = screen.width / screen.height;

// max number of animated pages
var MAX_PAGES = 20;

// use the selected background
var background = JSON.parse(localStorage.background);
document.body.style.background = background.substring(11);

// main auto-bind template
var t = document.querySelector('#t');

// repeat template
t.rep;

// neon-animated-pages element
t.p;

// array of all the photos to use for slide show and an index into it
t.itemsAll = [];
t.curIdx = 0;
t.noPhotos = false;

// array of photos max(MAX_PAGES) currently loaded into the animatable pages
// always changing subset of itemsAll
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
	t.photoSizing = parseInt(localStorage.photoSizing,10);
	switch (t.photoSizing) {
		case 0:
			t.sizingType = 'contain';
			break;
		case 1:
			t.sizingType = 'cover';
			break;
		case 2:
		case 3:
			t.sizingType = null;
			break;
		default:
			break;
	}

	if (myUtils.getChromeVersion() >= 42) {
		// override zoom factor - chrome 42 and later
		chrome.tabs.getZoom(function(zoomFactor) {
			if ((zoomFactor <= 0.99) || (zoomFactor >= 1.01)) {
				chrome.tabs.setZoom(1.0);
			}
		});
	}

	// load the photos for the slide show
	t.loadImages();

	// this will kick off the slideshow
	if (!t.noPhotos) {
		this.fire('pages-ready');
	}

});

// get references to the important elements of a slide
t.getEls = function(idx) {
	var ret = {};
	ret.item = t.items[idx];
	ret.image = t.p.querySelector('#' + ret.item.name);
	ret.author = t.p.querySelector('#' + ret.item.authorID);
	ret.time = t.p.querySelector('#' + ret.item.timeID);
	return ret;
};

// show more info on the current photo
t.showPhotoInfo = function() {
	if (t.noPhotos) {
		return;
	}
	var e = t.getEls(t.p.selected);
	var item = e.item;
	var path = item.path;
	var type = item.type;
	var re, id, url;

	switch (type) {
		case '500':
			re = /(\/[^\/]*){4}/;
			id = path.match(re);
			url = 'http://500px.com/photo' + id[1];
			chrome.tabs.create({url: url});
			break;
		case 'flickr':
			if (item.ex) {
				re = /(\/[^\/]*){4}(_.*_)/;
				id = path.match(re);
				url = 'https://www.flickr.com/photos/' + item.ex + id[1];
				chrome.tabs.create({url: url});
			}
			break;
		default:
			break;
	}
};

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
	var e = t.getEls(idx);
	var model = t.rep.modelForElement(e.time);
	var date = new Date();

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

// check if a photo would look bad cropped or streched
t.isBadAspect = function(aspect) {
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
	arr = arr.concat(t.getPhotos('useYesterday500px', 'yesterday500pxImages','500'));
	arr = arr.concat(t.getPhotos('useInterestingFlickr', 'flickrInterestingImages','flickr'));
	arr = arr.concat(t.getPhotos('useAuthors', 'authorImages','Google'));

	return arr;
};

t.ignorePhoto = function(item) {
	var ret = false;
	var skip = JSON.parse(localStorage.skip);
	// blah blah blah
	if ((!item.asp || isNaN(item.asp)) ||
			(skip && ((t.photoSizing === 1) || (t.photoSizing === 3)) && t.isBadAspect(item.asp))) {
		// ignore photos that dont have aspect ratio or would look really bad when cropped or stretched
		ret = true;
	}
	return ret;
};

// perform final processing on the selected photo sources and
// populate the pages
t.loadImages = function() {
	var count = 0;
	var author;
	var photoLabel;
	var arr = [];

	t.itemsAll = [];
	this.splice('items', 0, t.items.length);

	arr = t.getPhotoArray();

	if (JSON.parse(localStorage.shuffle)) {
		// randomize the order
		myUtils.shuffleArray(arr);
	}

	for (var i = 0; i < arr.length; i++) {

		arr[i].ignore = t.ignorePhoto(arr[i]);

		if (!arr[i].ignore) {

			arr[i].author ? author = arr[i].author : author = '';
			photoLabel = t.getPhotoLabel(author, arr[i].type);

			t.itemsAll.push({
				name: 'item' + (count + 1),
				path: arr[i].url,
				author: author,
				authorID: 'author' + (count + 1),
				type: arr[i].type,
				label: photoLabel,
				time: '',
				timeID: 'time' + (count + 1),
				sizingType: t.sizingType,
				aspectRatio: arr[i].asp,
				width: screen.width,
				height: screen.height,
				ex: arr[i].ex
			});
			if (count < MAX_PAGES) {
				// add a new animatable page - shallow copy
				t.push('items', JSON.parse(JSON.stringify(t.itemsAll[count])));
				t.curIdx++;
			}
			count++;
		}
	}

	if (!count) {
		t.$.noPhotos.style.visibility = 'visible';
		t.noPhotos = true;
	}

};

// position the text when using Letterbox
t.letterboxPhoto = function(idx) {
	var e = t.getEls(idx);
	var aspect = e.item.aspectRatio;
	var right,bottom;

	if (aspect < SCREEN_ASPECT) {
		right = (100 - aspect / SCREEN_ASPECT * 100) / 2;
		e.author.style.right = (right + 1) + 'vw';
		e.author.style.bottom = '';
		e.time.style.right = (right + 1) + 'vw';
		e.time.style.bottom = '';
	} else {
		bottom = (100 - SCREEN_ASPECT / aspect * 100) / 2;
		e.author.style.bottom = (bottom + 1) + 'vh';
		e.author.style.right = '';
		e.time.style.bottom = (bottom + 3.5) + 'vh';
		e.time.style.right = '';
	}
};

// strech photo
t.stretchPhoto = function(idx) {
	var e = t.getEls(idx);
	var img = e.image.$.img;
	img.style.width = '100%';
	img.style.height = '100%';
	img.style.objectFit = 'fill';
};

// show photo centered, with padding, border and shadow
// show it either scaled up or reduced to fit
t.framePhoto = function(idx) {
	var padding, border, borderBot;
	var e = t.getEls(idx);
	var img = e.image.$.img;
	var width, height;
	var frWidth, frHeight;
	var aspect = e.item.aspectRatio;

	// scale to screen size
	border = screen.height * 0.005;
	borderBot = screen.height * 0.05;
	padding = screen.height * 0.025;

	if (!JSON.parse(localStorage.showPhotog)) {
		// force use of photo label for this view
		var label = t.getPhotoLabel(e.item.author, e.item.type, true);
		var model = t.rep.modelForElement(e.image);
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

	e.image.height = height;
	e.image.width = width;
	e.image.style.top = (screen.height - frHeight) / 2 + 'px';
	e.image.style.left = (screen.width - frWidth) / 2 + 'px';
	e.image.style.border = 0.5 + 'vh ridge WhiteSmoke';
	e.image.style.borderRadius = '1.5vh';
	e.image.style.boxShadow = '1.5vh 1.5vh 1.5vh rgba(0,0,0,.7)';
	e.image.style.borderBottom = 5 + 'vh solid WhiteSmoke';

	if (parseInt(localStorage.showTime, 10)) {
		e.author.style.left = (screen.width - frWidth) / 2 + 10 + 'px';
		e.author.style.textAlign = 'left';
	} else {
		e.author.style.left = '0';
		e.author.style.width = screen.width + 'px';
		e.author.style.textAlign = 'center';
	}
	e.author.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
	e.author.style.color = 'black';
	e.author.style.opacity = 0.9;
	e.author.style.fontSize = '2.5vh';
	e.author.style.fontWeight = 300;

	e.time.style.right = (screen.width - frWidth) / 2 + 10 + 'px';
	e.time.style.textAlign = 'right';
	e.time.style.bottom = (screen.height - frHeight) / 2 + 10 + 'px';
	e.time.style.color = 'black';
	e.time.style.opacity = 0.9;
	e.time.style.fontSize = '3vh';
	e.time.style.fontWeight = 300;

};

// check if the photo threw a 404
t.isError = function(idx) {
	var e = t.getEls(idx);
	return e.image.error;
};

// check if the photo is loaded
t.isLoaded = function(idx) {
	var e = t.getEls(idx);
	return e.image && e.image.loaded;
};

// try to find a photo that is ready to display
t.findLoadedPhoto = function(idx) {
	if (t.isLoaded(idx)) {
		return idx;
	}
	for (var i = idx + 1; i < t.items.length; i++) {
		if (t.isLoaded(i)) {return i;}
	}
	for (i = 0; i < idx; i++) {
		if (t.isLoaded(i)) {return i;}
	}
	return -1;
};

// splice in the next photo from the master array
t.replacePhoto = function(idx, isError) {
	var e = t.getEls(idx);
	var item;

	if (isError) {
		// mark bad urls so we don't use them anymore
		var index = t.itemsAll.map(function(e) {return e.name;}).indexOf(e.item.name);
		if (index !== -1) {
			t.itemsAll[index].name = 'skip';
		}
	}

	if (t.started && (t.itemsAll.length > t.items.length)) {
		for (var i = t.curIdx; i < t.itemsAll.length; i++) {
			// find a url that is ok, AFAWK
			item = t.itemsAll[i];
			if (item.name !== 'skip') {
				t.curIdx = i;
				break;
			}
		}

		// splice in the next image at this page
		t.rep.splice('items', idx, 1, item);
		t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
	}
};

// add superscript to 500px
t.super500px = function(idx) {
	var e = t.getEls(idx);
	var sup = e.author.querySelector('#sup');

	if (e.item.type !== '500') {
		sup.textContent = '';
	} else {
		sup.textContent = 'px';
	}
};

// final prep before display
t.prepPhoto = function(idx) {
	t.setTime(idx);
	t.super500px(idx);
	switch (t.photoSizing) {
		case 0:
			t.letterboxPhoto(idx);
			break;
		case 2:
			t.framePhoto(idx);
			break;
		case 3:
			t.stretchPhoto(idx);
			break;
		default:
			break;
	}
};

// get the next photo to display
t.getNextPhoto = function(idx) {
	var ret = t.findLoadedPhoto(idx);
	if (ret === -1) {
		// no photos ready.. wait a second and try again
		t.waitTime = 1000;
	} else if (t.waitTime !== t.transitionTime) {
		// photo found, set the waitTime back to transition time in case it was changed
		t.waitTime = t.transitionTime;
	}
	return ret;
};

// called at fixed time intervals to cycle through the pages
t.runShow = function() {
	var curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
	var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
	var prevPage = (curPage > 0) ? curPage - 1 : t.items.length - 1;
	var selected = nextPage;

	if (t.isError(nextPage)) {
		// broken link, replace with next one from master array
		t.replacePhoto(nextPage, true);
	}

	// replace the photo that just ran with the next one
	t.replacePhoto(prevPage);

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
	t.timer = window.setTimeout(t.runShow, t.waitTime);
};

// This will run to infinity... and beyond
// each call to t.runShow will set another timeout
t.addEventListener('pages-ready', function() {
	t.waitTime = 2000;
	t.timer = window.setTimeout(t.runShow, t.waitTime);
});

// display source of photo and close window
window.addEventListener('click', function() {
	t.showPhotoInfo();
	window.close();
}, false);

// close preview window on Enter (prob won't work on Chrome OS)
window.addEventListener('keydown', function(event) {
	if (event.keyIdentifier === 'Enter') {
		window.close();
	}
}, false);

})();
