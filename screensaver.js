(function () {
	"use strict";

	var t = document.querySelector('#t');

	// flag to indicate that the slideshow has begun
	var started = false;

	addEventListener('template-bound', function (e) {
		var val,i;

		CoreStyle.g.transitions.xfadeDuration = '2000ms';
		CoreStyle.g.transitions.slideDuration = '2000ms';
		CoreStyle.g.transitions.scaleDuration = '2000ms';
		
		t.transitionTime = parseInt(localStorage.transitionTime,10) * 1000;
		t.sizingType = 'contain';
		t.transition = 'cross-fade';
		t.items = [];

		val = parseInt(localStorage.photoSizing,10);
		switch(val) {
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

		val = parseInt(localStorage.photoTransition,10);
		switch(val) {
			case 0:
				t.transition = 'scale-up';
				break;
			case 1:
				t.transition = 'cross-fade';
				break;
			case 2:
				t.transition = 'slide-from-right';
				break;
			case 3:
				t.transition = 'slide-up';
				break;
		}

		t.loadImages();

		// This will run to infinity... and beyond
		// The setTimeout lets us prep the first photo
		setTimeout(function () {
			t.nextPhoto();
			window.setInterval(t.nextPhoto,parseInt(t.transitionTime, 10));
		},5000);

	});

	// check if a photo would look bad cropped
	t.badAspect = function (aspectRatio) {
		var aspectRatioScreen = screen.width / screen.height;
		var cutoff = 0.5; // arbitrary

		if(aspectRatio && ((aspectRatio < aspectRatioScreen - cutoff) ||
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

		if(JSON.parse(localStorage.useGoogle)) {
			tmp = [];
			albumSelections = JSON.parse(localStorage.albumSelections);
			for(i=0; i < albumSelections.length; i++) {
				tmp = tmp.concat(albumSelections[i].photos);
				// TODO fix this
				/*	if(localStorage.badUserImages) {
					badImages = JSON.parse(localStorage.badUserImages);
					for(j=0; j < badImages.length; j++) {
							tmp[badImages[i]].ignore = true;
					}
				}*/
			}
			arr = arr.concat(tmp);
		}
		if(JSON.parse(localStorage.useChromecast)) {
			tmp = [];
			tmp = tmp.concat(chromeCast.getImages());
			if(localStorage.badCCImages) {
				badImages = JSON.parse(localStorage.badCCImages);
				for(i=0; i < badImages.length; i++) {
					tmp[badImages[i]].ignore = true;
				}
			}
			arr = arr.concat(tmp);
		}
		if(JSON.parse(localStorage.useAuthors)) {
			tmp = [];
			tmp = tmp.concat(JSON.parse(localStorage.authorImages));
			if(localStorage.badAuthorImages) {
				badImages = JSON.parse(localStorage.badAuthorImages);
				for(i=0; i < badImages.length; i++) {
					tmp[badImages[i]].ignore = true;
				}
			}
			arr = arr.concat(tmp);
		}

		return arr;
	};

	// perform final processing on the selected photo sources and
	// populate the pages
	t.loadImages = function () {
		var i,j,count=0;
		var author;
		var skip = JSON.parse(localStorage.skip);
		var arr = [];
		var img;
		var bg;

		arr = t.getPhotoArray();

		// randomize the order
		if(JSON.parse(localStorage.shuffle)) {
			chromeCast.shuffleArray(arr);
		}

		for(i=0; i < arr.length; i++) {

			// ignore photos that would look bad when cropped
			if(skip && (t.sizingType === 'cover') && t.badAspect(arr[i].asp)) {
				arr[i].ignore = true;
			}

			if(!arr[i].asp) {
				arr[i].asp = 16 / 9;
			}

			if (!arr[i].ignore) {

				arr[i].author ? author = arr[i].author : author = '';

				t.items.push({name: 'image' + (count + 1),
											path: arr[i].url,
											authorID: 'author' + (count + 1),
											author: author,
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
			bg = document.querySelector('#bg1-img');
			bg.style.visibility = 'visible';
		}
	};

	// position the text when using Letterbox
	t.posText = function (photoID) {
		var item = t.items[photoID];
		var aspectRatio = item.aspectRatio;
		var author = t.$.pages.querySelector('#'+item.authorID);
		var screenAspectRatio = screen.width / screen.height;
		var right,bottom;

		if(aspectRatio < screenAspectRatio) {
			right = (screen.width - (screen.height * aspectRatio)) / 2;
			author.style.right = (right + 30) + 'px';
		}
		else {
			bottom = (screen.height - (screen.width / aspectRatio)) / 2;
			author.style.bottom = (bottom + 20) + 'px';
		}
	};

	// show photo centered, with padding, border and shadow
	// show it either scaled up or reduced to fit
	t.framePhoto = function (photoID) {
		var padding = 30,border = 5,borderBot = 50;
		var item = t.items[photoID];
		var coreImage = t.$.pages.querySelector('#'+item.name);
		var author = t.$.pages.querySelector('#'+item.authorID);
		var img = coreImage.$.img;
		var width, height;
		var screenAspectRatio = screen.width / screen.height;
		var aspectRatio = item.aspectRatio;

		height = Math.min((screen.width - padding * 2 - border * 2) / aspectRatio,
											screen.height - padding * 2 - border - borderBot);
		width = height * aspectRatio;

		img.style.height = height + 'px';
		img.style.width = width + 'px';

		coreImage.height = height;
		coreImage.width = width;
		coreImage.style.top = (screen.height - height - borderBot - border) / 2 + 'px';
		coreImage.style.left = (screen.width - width) / 2 + 'px';
		coreImage.style.border = border + 'px ridge WhiteSmoke';
		coreImage.style.borderRadius = '15px';
		coreImage.style.boxShadow = '15px 15px 15px rgba(0,0,0,.7)';
		coreImage.style.borderBottom = borderBot + 'px solid WhiteSmoke';

		author.style.width = screen.width + 'px';
		author.style.right = '0px';
		author.style.bottom = (screen.height - height - borderBot - border + 20) / 2 + 'px';
		author.style.color = 'black';
		author.style.textAlign = 'center';
		author.style.opacity = 1;

	};

	// check if the photo is ready to display
	t.isComplete = function (photoID) {
		var item = t.items[photoID];
		var coreImage = t.$.pages.querySelector('#' + item.name);

		return !coreImage.loading;
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
					break;
				}
			}
		}
		
		return photoID;
	};

	// called at fixed time intervals to cycle through the pages
	t.nextPhoto = function () {
		var p = t.$.pages;
		var curPage = (p.selected === -1) ? 0 : p.selected;
		// wrap around when we get to the last photo
		var nextPage = (curPage === t.items.length - 1) ? 0 : curPage + 1;
		var itemCur = t.items[curPage];
		var curImage = p.querySelector('#'+itemCur.name);
		var mainContainer = t.$.mainContainer;
		var bg = document.querySelector('#bg-img');

		var selected = nextPage;

		if(!started) {
			// special case for first page
			selected = curPage;
			started = true;
			curImage.style.transition = 'opacity 0.5s linear';
		}

		if (!t.isComplete(selected)) {
			selected = t.findPhoto(selected);
		}

		if (!t.isComplete(selected)) {
			bg.style.visibility = 'visible';
			mainContainer.style.visibility = 'hidden';
		}
		else {
			bg.style.visibility = 'hidden';
			mainContainer.style.visibility = 'visible';
		} 
		if(!t.sizingType) {
			t.framePhoto(selected);
		}
		else if(t.sizingType === 'contain') {
			t.posText(selected);
		}

		p.querySelector('#' + t.items[selected].name).style.opacity = 1.0;
		p.selected = selected;
	};

	window.addEventListener('click', function () {
		chrome.windows.remove(parseInt(localStorage.windowID, 10));
	}, false);

	document.addEventListener('DOMContentLoaded', function () {
		// hide cursor
		if (!JSON.parse(localStorage.isPreview)) {
			document.body.style.cursor = 'none';
		}
	});

	// log pageview to google analytics
	ga('send', 'pageview', '/screensaver.html');

})();