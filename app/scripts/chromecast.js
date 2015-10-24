/*exported chromeCast*/
var chromeCast = (function() {
	'use strict';

	var ccImages;

	// read chromecast.json and save to localStorage
	function _loadChromecast(cb) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState === 4 && xhttp.status === 200) {
				ccImages = JSON.parse(xhttp.responseText);
				localStorage.ccImages = JSON.stringify(ccImages);
				cb();
			}
		};
		xhttp.open('GET', '/assests/chromecast.json', true);
		xhttp.send();
	}

	// save the indices of the bad images to localStorage
	// so they can be ignored
	function _imgError() {
		/*jshint validthis: true */
		var pos = [];
		pos[0] = ccImages.map(function(e) { return e.url.toUpperCase(); }).
																	indexOf(this.src.toUpperCase());

		if (pos[0] !== -1) {
			if (!localStorage.badCCImages) {
				localStorage.badCCImages	= JSON.stringify(pos);
			} else {
				var arr = JSON.parse(localStorage.badCCImages);
				arr.push(pos[0]);
				localStorage.badCCImages = JSON.stringify(arr);
			}
		}
	}

	return {

		// call this as early as possible
		preloadImages: function(count, cb) {

			_loadChromecast(function() {
				var imgs = [], img;
				var numImages = count || ccImages.length;

				for (var i = 0; i < numImages; i++) {
					img = new Image();
					img.addEventListener('error', _imgError);
					img.src = ccImages[i].url;
					imgs.push(img);
				}
				if (cb) {
					cb();
				}
			});
		}
	};
})();
