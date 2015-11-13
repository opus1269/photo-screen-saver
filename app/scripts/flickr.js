/*
@@license
*/
/*exported flickr*/
var flickr = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var API_KEY = '1edd9926740f0e0d01d4ecd42de60ac6';
	var MAX_PHOTOS = 300;

	return {

		loadImages: function() {
			var images = [], image;
			var aspectRatio;

			var flickr = new Flickr({api_key: API_KEY});

			flickr.interestingness.getList({api_key: API_KEY, extras: 'owner_name,url_k,media', per_page: MAX_PHOTOS}, function(err, list) {
				if (err) {
					console.log(err);
					return;
				}
				for (var i = 0; i < list.photos.photo.length; i++) {
					var photo = list.photos.photo[i];
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
			});
		}
	};
})();
