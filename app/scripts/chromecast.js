/*
@@license
*/
/* exported chromeCast */
var chromeCast = (function() {
	'use strict';

	return {

		/**
		 * get the photos from chromecast.json
		 * @param {function} callback (error, photos)
		 */
		loadImages: function(callback) {
			// callback(error, photos)
			callback = callback || function() {};
			var photos = [];

			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				if (xhr.status === 200) {
					photos = JSON.parse(xhr.responseText);
					for (var i = 0; i < photos.length; i++) {
						photos[i].asp = 16 / 9;
					}
					callback(null, photos);
				} else {
					callback(xhr.responseText);
				}
			};

			xhr.onerror = function(e) {
				callback(e);
			};

			xhr.open('GET', '/assets/chromecast.json', true);
			xhr.send();
		}
	};
})();
