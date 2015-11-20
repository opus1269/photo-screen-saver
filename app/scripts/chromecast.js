/*
@@license
*/
/*exported chromeCast*/
var chromeCast = (function() {
	'use strict';

	var ccImages;

	return {

		// read chromecast.json and save to localStorage
		loadImages: function() {
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					ccImages = JSON.parse(xhr.responseText);
					for (var i = 0; i < ccImages.length; i++) {
						ccImages[i].asp = 16 / 9;
					}
					localStorage.ccImages = JSON.stringify(ccImages);
				}
			};
			xhr.open('GET', '/assets/chromecast.json', true);
			xhr.send();
		}
	};
})();
