/*
@@license
*/
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

		// read chromecast.json 
		loadImages: function() {
			_loadChromecast();
		}
	};
})();
