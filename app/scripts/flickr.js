/*
@@license
*/
/*exported flickr*/
var flickr = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var URL = 'https://api.flickr.com/services/rest/';
	var KEY = '1edd9926740f0e0d01d4ecd42de60ac6';
	var MAX_PHOTOS = 300;

	return {

		loadImages: function() {
			var request = URL + '?method=flickr.interestingness.getList' +
				'&api_key=' + KEY + '&extras=owner_name,url_k,media' +
				'&per_page=' + MAX_PHOTOS + '&format=json' + '&nojsoncallback=1';
			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				var response = JSON.parse(xhr.response);
				var images = [], image;
				var aspectRatio;
				for (var i = 0; i < response.photos.photo.length; i++) {
					var photo = response.photos.photo[i];
					if (photo.url_k && photo.media === 'photo' && photo.isfriend !== '0' && photo.isfamily !== '0') {
						aspectRatio = parseInt(photo.width_k, 10) / parseInt(photo.height_k, 10);

						image = {};
						image.url = photo.url_k;
						image.ex = photo.owner;
						image.author = photo.ownername;
						image.asp = aspectRatio.toPrecision(3);
						images.push(image);
					}
				}
				localStorage.flickrInterestingImages = JSON.stringify(images);
			};

			xhr.onerror = function(e) {
				console.log('xhr',e);
			};

			xhr.open('GET', request, true);
			xhr.send();
		}
	};
})();
