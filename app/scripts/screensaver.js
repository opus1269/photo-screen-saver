/*
@@license
*/
(function() {
	'use strict';

	/**
	 * Display a screen saver
	 * @namespace ScreenSaver
	 */

	/**
	 * aspect ratio of screen
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf ScreenSaver
	 */
	const SCREEN_ASPECT = screen.width / screen.height;

	// max number of animated pages
	const MAX_PAGES = 20;

	// repeating alarm for updating time label
	const CLOCK_ALARM = 'updateTimeLabel';

	// selected background image
	const background = app.Utils.getJSON('background');
	document.body.style.background = background.substring(11);

	// main auto-bind template
	const t = document.querySelector('#t');

	// repeat template
	t.rep = null;
	
	// neon-animated-pages element
	t.p = null;

	// array of all the photos to use for slide show and an index into it
	t.itemsAll = [];
	t.curIdx = 0;

	// array of photos max(MAX_PAGES) currently loaded into the
	// neon-animated-pages always changing subset of itemsAll
	t.items = [];

	// the last selected page
	t.lastSelected = -1;

	// true after first full page animation
	t.started = false;

	// Flag to indicate the screen saver has no photos
	t.noPhotos = false;

	// Starting mouse position
	t.startMouse = {x: null, y: null};

	/**
	 * Event Listener for template bound event to know when bindings
	 * have resolved and content has been stamped to the page
	 */
	t.addEventListener('dom-change', function() {

		t.rep = t.$.repeatTemplate;
		t.p = t.$.pages;

		t.time = 'time';

		t.processZoom();

		t.processPhotoTransitions();

		t.processPhotoSizing();

		// listen for request to close screensaver
		chrome.runtime.onMessage.addListener(t.onMessage);

		// load the photos for the slide show
		t.loadImages();

		if (!t.noPhotos) {
			// kick off the slide show if there are photos selected
			// slight delay at beginning so we have a smooth start
			t.waitTime = 2000;
			t.timer = window.setTimeout(t.runShow, t.waitTime);
		}

	});

	/**
	 * Process Chrome window Zoom factor
	 */
	t.processZoom = function() {
		if (app.Utils.getChromeVersion() >= 42) {
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
		t.transitionType = app.Utils.getInt('photoTransition');
		if (t.transitionType === 8) {
			// pick random transition
			t.transitionType = app.Utils.getRandomInt(0, 7);
		}

		const trans = app.Utils.getJSON('transitionTime');
		t.transitionTime = trans.base * 1000;
		t.waitTime = t.transitionTime;
		t.waitForLoad = true;

		const showTime = app.Utils.getInt('showTime');
		if ((showTime !== 0) && (trans.base > 60)) {
			// add repeating alarm to update time label
			// if transition time is more than 1 minute
			// and time label is showing

			chrome.alarms.onAlarm.addListener(t.onAlarm);

			chrome.alarms.get(CLOCK_ALARM, function(alarm) {
				if (!alarm) {
					chrome.alarms.create(CLOCK_ALARM, {
						when: Date.now(),
						periodInMinutes: 1,
					});
				}
			});
		}
	};

	/**
	 * Process settings related to photo appearance
	 */
	t.processPhotoSizing = function() {
		t.photoSizing = app.Utils.getInt('photoSizing');
		if (t.photoSizing === 4) {
			// pick random sizing
			t.photoSizing = app.Utils.getRandomInt(0, 3);
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
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Object} Object containing the DOM elements of a slide
	 */
	t.getEls = function(idx) {
		const el = t.p.querySelector('#item' + idx);
		const ret = {};
		ret.item = t.items[idx];
		ret.image = el.querySelector('.image');
		ret.author = el.querySelector('.author');
		ret.time = el.querySelector('.time');
		return ret;
	};

	/**
	 * Build and set the time string
	 */
	t.setTime = function() {
		const format = app.Utils.getInt('showTime');
		const date = new Date();
		let timeStr;

		if (format === 0) {
			// don't show time
			timeStr = '';
		} else if (format === 1) {
			// 12 hour format
			timeStr = date.toLocaleTimeString(
				'en-us', {hour: 'numeric', minute: '2-digit', hour12: true});
			if (timeStr.endsWith('M')) {
				// strip off AM/PM
				timeStr = timeStr.substring(0, timeStr.length - 3);
			}
		} else {
			// 24 hour format
			timeStr = date.toLocaleTimeString(navigator.language,
				{hour: 'numeric', minute: '2-digit', hour12: false});
		}
		t.set('time', timeStr);
	};

	/**
	 * Build the Array of photos that will be displayed
	 * and populate the neon-animated-pages
	 */
	t.loadImages = function() {
		let count = 0;
		let arr;

		t.itemsAll = [];
		this.splice('items', 0, t.items.length);

		arr = app.PhotoSource.getSelectedPhotos();

		if (app.Utils.getBool('shuffle')) {
			// randomize the order
			app.Utils.shuffleArray(arr);
		}

		for (let i = 0; i < arr.length; i++) {

			if (!app.Photo.ignore(arr[i].asp, SCREEN_ASPECT, t.photoSizing)) {
				const photo =
					new app.Photo('photo' + count, arr[i]);
				t.itemsAll.push(photo);

				if (count < MAX_PAGES) {
					// add a new animatable page - shallow copy
					t.push('items',
						JSON.parse(JSON.stringify(t.itemsAll[count])));
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
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.letterboxPhoto = function(idx) {
		const e = t.getEls(idx);
		const aspect = e.item.aspectRatio;
		let right;
		let bottom;

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
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.stretchPhoto = function(idx) {
		const e = t.getEls(idx);
		const img = e.image.$.img;
		img.style.width = '100%';
		img.style.height = '100%';
		img.style.objectFit = 'fill';
	};

	/**
	 * Finalize DOM for a framed photo
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.framePhoto = function(idx) {
		const e = t.getEls(idx);
		const author = e.author;
		const time = e.time;
		const image = e.image;
		const img = image.$.img;
		const photo = e.item;
		const aspect = photo.aspectRatio;
		let padding;
		let border;
		let borderBot;
		let width;
		let height;
		let frWidth;
		let frHeight;

		// scale to screen size
		border = screen.height * 0.005;
		borderBot = screen.height * 0.05;
		padding = screen.height * 0.025;

		if (!app.Utils.getBool('showPhotog')) {
			// force use of photo label for this view
			const label = photo.buildLabel(true);
			const model = t.rep.modelForElement(image);
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
		image.style.borderBottom = 5 + 'vh solid WhiteSmoke';
		image.style.borderRadius = '1.5vh';
		image.style.boxShadow = '1.5vh 1.5vh 1.5vh rgba(0,0,0,.7)';

		if (app.Utils.getInt('showTime')) {
			author.style.left = (screen.width - frWidth) / 2 + 10 + 'px';
			author.style.textAlign = 'left';
		} else {
			author.style.left = '0';
			author.style.width = screen.width + 'px';
			author.style.textAlign = 'center';
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
		time.style.fontSize = '3vh';
		time.style.fontWeight = 300;
	};

	/**
	 * Add superscript to the label for 500px photos
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.super500px = function(idx) {
		const e = t.getEls(idx);
		const sup = e.author.querySelector('#sup');

		e.item.type === '500' ? sup.textContent = 'px' : sup.textContent = '';
	};

	/**
	 * Finalize DOM for a photo
	 * @param {Integer} idx index into {@link t.items}
	 */
	t.prepPhoto = function(idx) {
		t.setTime();
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
	 * Determine if a photo failed to load (usually 404 error)
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Boolean} true if image load failed
	 */
	t.isError = function(idx) {
		const e = t.getEls(idx);
		return !e.image || e.image.error;
	};

	/**
	 * Determine if a photo has finished loading
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Boolean} true if image is loaded
	 */
	t.isLoaded = function(idx) {
		const e = t.getEls(idx);
		return e.image && e.image.loaded;
	};

	/**
	 * Try to find a photo that has finished loading
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Integer} index into t.items of a loaded photo,
	 * -1 if none are loaded
	 */
	t.findLoadedPhoto = function(idx) {
		if (t.isLoaded(idx)) {
			return idx;
		}
		for (let i = idx + 1; i < t.items.length; i++) {
			if ((i !== t.lastSelected) &&
				(i !== t.p.selected) &&
				t.isLoaded(i)) {
				return i;
			}
		}
		for (let i = 0; i < idx; i++) {
			if ((i !== t.lastSelected) &&
				(i !== t.p.selected) &&
				t.isLoaded(i)) {
				return i;
			}
		}
		return -1;
	};

	/**
	 * Add the next photo from the master array
	 * @param {Integer} idx index into {@link t.items}
	 * @param {Boolean} error true if the photo at idx is bad (didn't load)
	 */
	t.replacePhoto = function(idx, error) {
		let item;

		if (error) {
			// bad url, mark it
			const e = t.getEls(idx);
			const index = t.itemsAll.map(function(ev) {
				return ev.name;
			}).indexOf(e.item.name);
			if (index !== -1) {
				t.itemsAll[index].name = 'skip';
			}
		}

		if (t.started && (t.itemsAll.length > t.items.length)) {
			for (let i = t.curIdx; i < t.itemsAll.length; i++) {
				// find a url that is ok, AFAWK
				item = t.itemsAll[i];
				if (item.name !== 'skip') {
					t.curIdx = i;
					break;
				}
			}
			// add the next image from the master list to this page
			t.rep.set('items.' + idx, JSON.parse(JSON.stringify(item)));
			t.curIdx = (t.curIdx === t.itemsAll.length - 1) ? 0 : t.curIdx + 1;
		}
	};

	/**
	 * Replace the active photos with new photos from the master array
	 */
	t.replaceAllPhotos = function() {
		if (t.itemsAll.length > t.items.length) {
			let pos = 0;
			let item;
			let newIdx = t.curIdx;
			for (let i = t.curIdx; i < t.itemsAll.length; i++) {
				newIdx = i;
				item = t.itemsAll[i];
				if (item.name !== 'skip') {
					if ((pos !== t.lastSelected) &&
						(pos !== t.p.selected)) {
						// don't replace the last two
						t.rep.set('items.' + pos,
							JSON.parse(JSON.stringify(item)));
					}
					pos++;
					if (pos === t.items.length) {
						break;
					}
				}
			}
			t.curIdx = (newIdx === t.itemsAll.length - 1) ? 0 : newIdx + 1;
		}
	};

	/**
	 * Get the next photo to display
	 * @param {Integer} idx index into {@link t.items}
	 * @return {Integer} next index into {@link t.items} to display,
	 * -1 if none are ready
	 */
	t.getNextPhoto = function(idx) {
		let ret = t.findLoadedPhoto(idx);
		if (ret === -1) {
			if (t.waitForLoad) {
				// no photos ready.. wait a little and try again the first time
				t.waitTime = 2000;
				t.waitForLoad = false;
			} else {
				// tried waiting for load, now replace the current photos
				t.waitTime = 200;
				t.replaceAllPhotos();
				idx = (idx === t.items.length - 1) ? 0 : idx + 1;
				ret = t.findLoadedPhoto(idx);
			}
		} else if (t.waitTime !== t.transitionTime) {
			// photo found, set the waitTime back to transition time in case
			// it was changed
			t.waitTime = t.transitionTime;
		}
		return ret;
	};

	/**
	 * Called at fixed time intervals to cycle through the photos
	 * Runs forever
	 */
	t.runShow = function() {
		const curPage = (t.p.selected === undefined) ? 0 : t.p.selected;
		const prevPage = (curPage > 0) ? curPage - 1 : t.items.length - 1;
		let selected = (curPage === t.items.length - 1) ? 0 : curPage + 1;

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
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {object} request - details for the message
	 * @param {object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 */
	t.onMessage = function(request, sender, response) {
		if (request.message === 'close') {
			t.closeWindow();
		} else if(request.message === 'isShowing') {
			// let people know we are here
			response({message: 'OK'});
		}
	};

	/**
	 * Listen for alarms
	 * @param {Object} alarm
	 * @param {String} alarm.name - alarm type
	 */
	t.onAlarm = function(alarm) {
		if (alarm.name === CLOCK_ALARM) {
			// update time label
			if (t.p.selected !== undefined) {
				t.setTime();
			}
		}
	};

	/**
	 * Close ourselves
	 */
	t.closeWindow = function() {
		// send message to other screen savers to close themselves
		chrome.runtime.sendMessage({
			message: 'close',
		}, function() {});

		setTimeout(function() {
			// delay a little to process events
			window.close();
		}, 750);
	};

	/**
	 * Event listener for mouse clicks
	 * Show link to original photo if possible and close windows
	 */
	window.addEventListener('click', function() {
		if (t.p.selected) {
			app.Photo.showSource(t.items[t.p.selected]);
		}
		t.closeWindow();
	}, false);

	/**
	 * Event listener for key press
	 * Close window (prob won't work on Chrome OS)
	 */
	window.addEventListener('keydown', function() {
		t.closeWindow();
	}, false);

	/**
	 * Event listener for mouse move
	 * Close window
	 */
	window.addEventListener('mousemove', function(event) {
		if (t.startMouse.x && t.startMouse.y) {
			const deltaX = Math.abs(event.clientX - t.startMouse.x);
			const deltaY = Math.abs(event.clientY - t.startMouse.y);
			if (Math.max(deltaX, deltaY) > 10) {
				// close after a minimum amount of mouse movement
				t.closeWindow();
			}
		} else {
			// first move, set values
			t.startMouse.x = event.clientX;
			t.startMouse.y = event.clientY;
		}
	}, false);

})();
