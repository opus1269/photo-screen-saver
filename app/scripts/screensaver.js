(function() {
	'use strict';

	// main template and pages repeat temple
	var t = document.querySelector('#t');
	var tPages;

	// array of photos to use for slide show
	t.items = [];

	t.addEventListener('dom-change', function() {

		tPages = document.querySelector('#repeatTemplate');

		t.transitionType = parseInt(localStorage.photoTransition,10);
		t.transitionTime = parseInt(localStorage.transitionTime,10) * 1000;
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

		// show cursor for preview
		if (JSON.parse(localStorage.isPreview)) {
			document.body.style.cursor = 'auto';
		}

		// load the photos for the slide show
		this.debounce('job1', function() {
			t.loadImages();
			this.fire('pages-ready');
		});

	});

	// This will run to infinity... and beyond
	// cycling through the selected photos
	t.addEventListener('pages-ready', function() {
		Polymer.dom.flush();
		this.async(function() {
			t.nextPhoto();
			window.setInterval(t.nextPhoto, parseInt(t.transitionTime, 10));
		}, 2000);
	});

	// create the photo label
	t.getPhotoLabel = function(author, force) {
		var ret = '';
		if (force || JSON.parse(localStorage.showPhotog)) {
			if (author !== '') {
				ret = 'Photo by ' + author;
			} else {
				ret = 'Photo from Google+';
			}
		}
		return ret;
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

	// prepare the array of photos the user has selected
	t.getPhotoArray = function() {
		var badImages;
		var albumSelections;
		var arr = [], tmp = [];
		var i;

		if (JSON.parse(localStorage.useGoogle)) {
			tmp = [];
			albumSelections = JSON.parse(localStorage.albumSelections);
			for (i = 0; i < albumSelections.length; i++) {
				tmp = tmp.concat(albumSelections[i].photos);
				// TODO fix this
				/*	if (localStorage.badUserImages) {
					badImages = JSON.parse(localStorage.badUserImages);
					for (j=0; j < badImages.length; j++) {
							tmp[badImages[i]].ignore = true;
					}
				}*/
			}
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.useChromecast)) {
			tmp = [];
			tmp = tmp.concat(chromeCast.getImages());
			if (localStorage.badCCImages) {
				badImages = JSON.parse(localStorage.badCCImages);
				for (i = 0; i < badImages.length; i++) {
					tmp[badImages[i]].ignore = true;
				}
			}
			arr = arr.concat(tmp);
		}
		if (JSON.parse(localStorage.useAuthors)) {
			tmp = [];
			tmp = tmp.concat(JSON.parse(localStorage.authorImages));
			if (localStorage.badAuthorImages) {
				badImages = JSON.parse(localStorage.badAuthorImages);
				for (i = 0; i < badImages.length; i++) {
					tmp[badImages[i]].ignore = true;
				}
			}
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
		var bg;

		this.splice('items', 0, t.items.length);

		arr = t.getPhotoArray();

		// randomize the order
		if (JSON.parse(localStorage.shuffle)) {
			chromeCast.shuffleArray(arr);
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
				photoLabel = t.getPhotoLabel(author);

				// the Polymer way - !important
				this.push('items', {name: 'image' + (count + 1),
									path: arr[i].url,
									authorID: 'author' + (count + 1),
									author: author,
									label: photoLabel,
									sizingType: t.sizingType,
									aspectRatio: arr[i].asp,
									width: screen.width,
									height: screen.height
				});
				count++;
			}
		}

		if (!count) {
			// no photos to show
			bg = document.querySelector('#bg1Img');
			bg.style.visibility = 'visible';
		}

	};

	// position the text when using Letterbox
	t.posText = function(photoID) {
		var item = t.items[photoID];
		var aspectRatio = item.aspectRatio;
		var author = t.$.pages.querySelector('#' + item.authorID);
		var screenAspectRatio = screen.width / screen.height;
		var right,bottom;

		if (aspectRatio < screenAspectRatio) {
			right = (screen.width - (screen.height * aspectRatio)) / 2;
			author.style.right = (right + 30) + 'px';
		} else {
			bottom = (screen.height - (screen.width / aspectRatio)) / 2;
			author.style.bottom = (bottom + 20) + 'px';
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
		var img = image.$.img;
		var width, height;
		var aspectRatio = item.aspectRatio;

		// force use of photo label for this view
		if (!JSON.parse(localStorage.showPhotog)) {
			var label = t.getPhotoLabel(item.author,true);
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

		author.style.width = screen.width + 'px';
		author.style.right = '0px';
		author.style.bottom = (screen.height - height - borderBot - border + 20) / 2 + 'px';
		author.style.color = 'black';
		author.style.textAlign = 'center';
		author.style.opacity = 1;

	};

	// check if the photo is ready to display
	t.isComplete = function(photoID) {
		var item = t.items[photoID];
		var image = t.$.pages.querySelector('#' + item.name);

		return image && !image.loading;
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
			for (i = 0; i < t.items.length; i++) {
				if (t.isComplete(i)) {
					photoID = i;
					found = true;
					break;
				}
			}
		}
		return photoID;
	};

	// called at fixed time intervals to cycle through the pages
	t.nextPhoto = function() {
		var p = t.$.pages;
		var curPage = parseInt(((!p.selected) ? 0 : p.selected),10);
		// wrap around when we get to the last photo
		var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
		var mainContainer = t.$.mainContainer;
		var bg = document.querySelector('#bgImg');

		var selected = nextPage;

		// special case for first page
		if (p.selected === undefined) {
			selected = curPage;
		}

		if (!t.isComplete(selected)) {
			selected = t.findPhoto(selected);
		}

		if (!t.isComplete(selected)) {
			bg.style.visibility = 'visible';
			mainContainer.style.visibility = 'hidden';
		} else {
			// prep photos
			if (!t.sizingType) {
				t.framePhoto(selected);
			} else if (t.sizingType === 'contain') {
				t.posText(selected);
			}
			// display slide
			bg.style.visibility = 'hidden';
			mainContainer.style.visibility = 'visible';

			// set the selected so the animation runs
			p.selected = selected;
		}
	};

	// close preview window on click
	window.addEventListener('click', function() {
		chrome.windows.remove(parseInt(localStorage.windowID, 10));
	}, false);

})();
