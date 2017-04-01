/*
@@license
*/
(function() {
	'use strict';

	// aspect ratio of screen
	var SCREEN_ASPECT = screen.width / screen.height;

	// max number of animated pages
	var MAX_PAGES = 20;

	// repeating alarm for updating time label
	var CLOCK_ALARM = 'updateTimeLabel';

	// selected background image
	var background = myUtils.getJSON('background');
	document.body.style.background = background.substring(11);

	// main auto-bind template
	var t = document.querySelector('#t');

	// repeat template
	t.rep = null;
	
	// neon-animated-pages element
	t.p = null;

	// array of all the photos to use for slide show and an index into it
	t.itemsAll = [];
	t.curIdx = 0;

	// array of photos max(MAX_PAGES) currently loaded into the neon-animated-pages
	// always changing subset of itemsAll
	t.items = [];

	// the last selected page
	t.lastSelected = -1;

	// true after first full page animation
	t.started = false;

	// Flag to indicate the screen saver has no photos
	t.noPhotos = false;

	/**
	 * Event Listener for template bound event to know when bindings
	 * have resolved and content has been stamped to the page
	 */
	t.addEventListener('dom-change', function() {

		t.rep = t.$.repeatTemplate;
		t.p = t.$.pages;

		t.processZoom();

		t.processPhotoTransitions();

		t.processPhotoSizing();

		// listen for request to close screensaver
		chrome.runtime.onMessage.addListener(t.onMessage);

		// load the photos for the slide show
		t.loadImages();

		if (!t.noPhotos) {
			// kick off the slide show if there are photos selected
			this.fire('pages-ready');
		}

	});

	/**
	 * Process Chrome window Zoom factor
	 */
	t.processZoom = function() {
		if (myUtils.getChromeVersion() >= 42) {
			// override zoom factor to 1.0 - chrome 42 and later
			chrome.tabs.getZoom(function(zoomFactor) {
				if ((zoomFactor <= 0.99) || (zoomFactor >= 1.01)) {
					chrome.tabs.setZoom(1.0);
				}
			});
		}
	};

	/**
	 * Process settings related to between photo transition
	 */
	t.processPhotoTransitions = function() {
		t.transitionType = myUtils.getInt('photoTransition');
		if (t.transitionType === 8) {
			// pick random transition
			t.transitionType = myUtils.getRandomInt(0, 7);
		}

		var trans = myUtils.getJSON('transitionTime');
		t.transitionTime = trans.base * 1000;
		t.waitTime = t.transitionTime;

		var showTime = myUtils.getInt('showTime');
		if ((showTime !== 0) && (trans.base > 60)) {
			// add repeating alarm to update time label
			// if transition time is more than 1 minute
			// and time label is showing

			chrome.alarms.onAlarm.addListener(t.onAlarm);

			chrome.alarms.get(CLOCK_ALARM, function(alarm) {
				if (!alarm) {
					chrome.alarms.create(CLOCK_ALARM, {
						when: Date.now(),
						periodInMinutes: 1
					});
				}
			});
		}
	};

	/**
	 * Process settings related to photo appearance
	 */
	t.processPhotoSizing = function() {
		t.photoSizing = myUtils.getInt('photoSizing');
		if (t.photoSizing === 4) {
			// pick random sizing
			t.photoSizing = myUtils.getRandomInt(0, 3);
		}
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
	};

	/**
	 * Get references to the important elements of a slide
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Object} Object containing the DOM elements of a slide
	 *
	 */
	t.getEls = function(idx) {
		var el = t.p.querySelector('#item' + idx);
		var ret = {};
		ret.item = t.items[idx];
		ret.image = el.querySelector('.image');
		ret.author = el.querySelector('.author');
		ret.time = el.querySelector('.time');
		return ret;
	};

	/**
	 * Create a new tab with a link to the
	 * original source of the current slide show photo, if possible
	 */
	t.showPhotoInfo = function() {
		if (t.noPhotos) {
			return;
		}
		var e = t.getEls(t.p.selected);
		var item = e.item;
		var path = item.path;
		var regex;
		var id;
		var url;

		switch (item.type) {
			case '500':
				// parse photo id
				regex = /(\/[^\/]*){4}/;
				id = path.match(regex);
				url = 'http://500px.com/photo' + id[1];
				chrome.tabs.create({url: url});
				break;
			case 'flickr':
				if (item.ex) {
					// parse photo id
					regex = /(\/[^\/]*){4}(_.*_)/;
					id = path.match(regex);
					url = 'https://www.flickr.com/photos/' + item.ex + id[1];
					chrome.tabs.create({url: url});
				}
				break;
			case 'reddit':
				if (item.ex) {
					chrome.tabs.create({url: item.ex});
				}
				break;
			default:
				break;
		}
	};

	/**
	 * Create the photo label
	 *
	 * @param {String} author photographer
	 * @param {String} type Photo source type
	 * @param {Boolean} force require display of label if true
	 * @return {String} label describing the photo source and photographer name
	 *
	 */
	t.getPhotoLabel = function(author, type, force) {
		var ret = '';
		var idx = type.search('User');

		if (!force && !myUtils.getBool('showPhotog') && (idx !== -1)) {
			// don't show label for user's own photos, if requested
			return ret;
		}

		if (idx !== -1) {
			// strip off 'User'
			type = type.substring(0, idx - 1);
		}

		if (author) {
			ret = author + ' / ' + type;
		} else {
			// no photographer name
			ret = 'Photo from ' + type;
		}
		return ret;
	};

	/**
	 * Build and set the time string
	 *
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.setTime = function(idx) {
		var format = myUtils.getInt('showTime');
		var e = t.getEls(idx);
		var model = t.rep.modelForElement(e.time);
		var date = new Date();
		var timeStr;

		if (format === 0) {
			// don't show time
			timeStr = '';
		} else if (format === 1) {
			// 12 hour format
			timeStr = date.toLocaleTimeString(
				'en-us', {hour: 'numeric', minute: '2-digit',  hour12: true});
			if (timeStr.endsWith('M')) {
				// strip off AM/PM
				timeStr = timeStr.substring(0, timeStr.length - 3);
			}
		} else {
			// 24 hour format
			timeStr = date.toLocaleTimeString(navigator.language,
				{hour: 'numeric', minute: '2-digit', hour12: false});
		}
		model.set('item.time', timeStr);
	};

	/**
	 * Determine if a photo would look bad zoomed or stretched on the screen
	 *
	 * @param {Number} aspect aspect ratio of photo
	 * @return {boolean} true if a photo aspect ratio differs substantially from the screens'
	 *
	 */
	t.isBadAspect = function(aspect) {
		// arbitrary
		var CUT_OFF = 0.5;

		return (aspect && ((aspect < SCREEN_ASPECT - CUT_OFF) || (aspect > SCREEN_ASPECT + CUT_OFF)));
	};

	/**
	 * Determine if a photo should not be displayed
	 *
	 * @param {Object} item the photo item
	 * @return {Boolean} true if the photo should not be displayed
	 *
	 */
	t.ignorePhoto = function(item) {
		var ret = false;
		var skip = myUtils.getBool('skip');

		if ((!item || !item.asp || isNaN(item.asp)) ||
			(skip && ((t.photoSizing === 1) || (t.photoSizing === 3)) &&
			t.isBadAspect(item.asp))) {
			// ignore photos that don't have aspect ratio
			// or would look bad with cropped or stretched sizing options
			ret = true;
		}
		return ret;
	};

	/**
	 * Build the Array of photos that will be displayed
	 * and populate the neon-animated-pages
	 */
	t.loadImages = function() {
		var count = 0;
		var author;
		var photoLabel;
		var arr;

		t.itemsAll = [];
		this.splice('items', 0, t.items.length);

		arr = photoSources.getSelectedPhotos();

		if (myUtils.getBool('shuffle')) {
			// randomize the order
			myUtils.shuffleArray(arr);
		}

		for (var i = 0; i < arr.length; i++) {

			if (!t.ignorePhoto(arr[i])) {

				arr[i].author ? author = arr[i].author : author = '';
				photoLabel = t.getPhotoLabel(author, arr[i].type, false);

				t.itemsAll.push({
					name: 'photo' + count,
					path: arr[i].url,
					author: author,
					type: arr[i].type,
					label: photoLabel,
					time: '',
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
			// No usable photos, display static image
			t.$.noPhotos.style.visibility = 'visible';
			t.noPhotos = true;
		}

	};

	/**
	 * Finalize DOM for a letter boxed photo
	 *
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.letterboxPhoto = function(idx) {
		var e = t.getEls(idx);
		var aspect = e.item.aspectRatio;
		var right;
		var bottom;

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

	/**
	 * Finalize DOM for a stretched photo
	 *
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.stretchPhoto = function(idx) {
		var e = t.getEls(idx);
		var img = e.image.$.img;
		img.style.width = '100%';
		img.style.height = '100%';
		img.style.objectFit = 'fill';
	};

	/**
	 * Finalize DOM for a framed photo
	 *
	 * @param {Integer} idx index into {@link t.items}
	 */
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

		if (!myUtils.getBool('showPhotog')) {
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
		e.image.style.borderBottom = 5 + 'vh solid WhiteSmoke';
		e.image.style.borderRadius = '1.5vh';
		e.image.style.boxShadow = '1.5vh 1.5vh 1.5vh rgba(0,0,0,.7)';

		if (myUtils.getInt('showTime')) {
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

	/**
	 * Determine if a photo failed to load (usually 404 error)
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Boolean} true if image load failed
	 */
	t.isError = function(idx) {
		var e = t.getEls(idx);
		return !e.image || e.image.error;
	};

	/**
	 * Determine if a photo has finished loading
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Boolean} true if image is loaded
	 */
	t.isLoaded = function(idx) {
		var e = t.getEls(idx);
		return e.image && e.image.loaded;
	};

	/**
	 * Try to find a photo that has finished loading
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Integer} index into t.items of a loaded photo, -1 if none are loaded
	 */
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

	/**
	 * Splice in the next photo from the master array
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @param {Boolean} error true if the photo at idx is bad (didn't load)
	 */
	t.replacePhoto = function(idx, error) {
		var item;

		if (error) {
			// bad url, mark it
			var e = t.getEls(idx);
			var index = t.itemsAll.map(function(ev) {return ev.name;}).indexOf(e.item.name);
			if (index !== -1) {
				t.itemsAll[index].name = 'skip';
			}
		}

		if (t.started && t.itemsAll.length > t.items.length) {
			for (var i = t.curIdx; i < t.itemsAll.length; i++) {
				// find a url that is ok, AFAWK
				item = t.itemsAll[i];
				if (item.name !== 'skip') {
					t.curIdx = i;
					break;
				}
			}
			// splice in the next image at this page
			t.rep.splice('items', idx, 1, JSON.parse(JSON.stringify(item)));
			t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
		}
	};

	/**
	 * Add superscript to the label for 500px photos
	 *
	 * @param {Integer} idx index into {@link t.items}
	 *
	 */
	t.super500px = function(idx) {
		var e = t.getEls(idx);
		var sup = e.author.querySelector('#sup');

		e.item.type === '500' ? sup.textContent = 'px' : sup.textContent = '';
	};

	/**
	 * Finalize DOM for a photo
	 *
	 * @param {Integer} idx index into {@link t.items}
	 *
	 */
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

	/**
	 * Get the next photo to display
	 *
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Integer} next index into {@link t.items} to display, -1 if none are ready
	 *
	 */
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

	/**
	 * Called at fixed time intervals to cycle through the photos
	 * Runs forever
	 */
	t.runShow = function() {
		var curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
		var prevPage = (curPage > 0) ? curPage - 1 : t.items.length - 1;
		var selected = (curPage === t.items.length - 1) ? 0 : curPage + 1;

		// replace the previous selected with the next one from master array
		t.replacePhoto(t.lastSelected, false);

		if (t.isError(prevPage)) {
			// broken link, mark it and replace it
			t.replacePhoto(prevPage, true);
		}

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
			// If a new photo is ready, prep it
			t.prepPhoto(selected);

			// update t.p.selected so the animation runs
			t.lastSelected = t.p.selected;
			t.p.selected = selected;
		}

		// setup the next timer --- runs forever
		t.timer = window.setTimeout(t.runShow, t.waitTime);
	};

	/**
	 * Listen for app messages
	 *
	 * @param {JSON} request
	 *
	 */
	t.onMessage = function(request) {
		if (request.message === 'close') {
			t.closeWindow();
		}
	};

	/**
	 * Listen for alarms
	 *
	 * @param {Object} alarm
	 */
	t.onAlarm = function(alarm) {
		if (alarm.name === CLOCK_ALARM) {
			// update time label
			if (t.p.selected !== undefined) {
				t.setTime(t.p.selected);
			}
		}
	};

	/**
	 * Close ourselves
	 */
	t.closeWindow = function() {
		chrome.alarms.clear(CLOCK_ALARM, function() {
			window.close();
		});
	};

	/**
	 * Event listener to start slide show.
	 * It will run to infinity... and beyond
	 * each call to t.runShow will set another timeout
	 */
	t.addEventListener('pages-ready', function() {
		// slight delay at beginning so we have a smooth start
		t.waitTime = 2000;
		t.timer = window.setTimeout(t.runShow, t.waitTime);
	});

	/**
	 * Event listener for mouse clicks
	 * Show link to original photo if possible and end slide show
	 */
	window.addEventListener('click', function() {
		t.showPhotoInfo();
		t.closeWindow();
	}, false);

	/**
	 * Event listener for Enter key press
	 * Close preview window on Enter (prob won't work on Chrome OS)
	 *
	 */
	window.addEventListener('keydown', function(event) {
		if (event.key === 'Enter') {
			t.closeWindow();
		}
	}, false);

})();
