/*
@@license
*/
/* exported flickr*/
var flickr = (function() {
	'use strict';

	var URL = 'https://api.flickr.com/services/rest/';
	var KEY = '1edd9926740f0e0d01d4ecd42de60ac6';
	var MAX_PHOTOS = 300;

	return {

		/**
		 * retrieve flickr photos
		 * @param {function} callback (error, photos)
		 */
		loadImages: function(callback) {
			// callback(error, photos)
			callback = callback || function() {};

			var request = URL + '?method=flickr.interestingness.getList' +
				'&api_key=' + KEY + '&extras=owner_name,url_k,media' +
				'&per_page=' + MAX_PHOTOS + '&format=json' + '&nojsoncallback=1';

			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				var response = JSON.parse(xhr.response);
				if (response.stat !== 'ok') {
					callback(response.message);
				} else {
					var images = [];
					var asp;
					for (var i = 0; i < response.photos.photo.length; i++) {
						var photo = response.photos.photo[i];
						if (photo.url_k && photo.media === 'photo' && photo.isfriend !== '0' && photo.isfamily !== '0') {
							asp = parseInt(photo.width_k, 10) / parseInt(photo.height_k, 10);
							myUtils.addImage(images, photo.url_k, photo.ownername, asp, photo.owner);
						}
					}
					callback(null, images);
				}
			};

			xhr.onerror = function(e) {
				callback(e);
			};

			xhr.open('GET', request, true);
			xhr.send();
		}
	};
})();
