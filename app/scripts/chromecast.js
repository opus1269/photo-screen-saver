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
				for (var i = 0; i < ccImages.length; i++) {
					ccImages[i].asp = 16 / 9;
				}
				localStorage.ccImages = JSON.stringify(ccImages);
				cb();
			}
		};
		xhttp.open('GET', '/assets/chromecast.json', true);
		xhttp.send();
	}

	return {

		// read chromecast.json and optionally preload the images
		loadImages: function(preload) {

			_loadChromecast(function() {
				if (!preload) {
					return;
				}
				var imgs = [], img;
				var numImages = ccImages.length;

				for (var i = 0; i < numImages; i++) {
					img = new Image();

					// cut out bad images
					img.onerror = function() {
						/*jshint validthis: true */
						var ims = JSON.parse(localStorage.ccImages);
						var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
						if (ind >= 0) {
							ims.splice(ind, 1);
							localStorage.ccImages = JSON.stringify(ims);
						}
					};

					img.src = ccImages[i].url;
					imgs.push(img);
				}
			});
		}
	};
})();
