/*exported flickr*/
var flickr = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var API_KEY = '1edd9926740f0e0d01d4ecd42de60ac6';
	var MAX_PHOTOS = 300;
	var TYPE_ENUM = Object.freeze({'interesting': 1, 'favorite': 2});

	// get the favorites from the flickr account
	function loadFavorites(preload) {
		var imgs = [], img;
		var images = [], image;
		var aspectRatio;

		var flickr = new Flickr({api_key: API_KEY});

		flickr.favorites.getPublicList({api_key: API_KEY,
			user_id: '66956608@N06',
			extras: 'owner_name,url_k,media',
			per_page: MAX_PHOTOS}, function(err, list) {
				if (err) {
					console.log(err);
					return;
				}
				for (var i = 0; i < list.photos.photo.length; i++) {
					var photo = list.photos.photo[i];
					if (photo.url_k && photo.media === 'photo' &&
						photo.isfriend !== '0' && photo.isfamily !== '0' &&
						photo.ownername !== 'Yahoo On the Road') {
						aspectRatio = parseInt(photo.width_l, 10) / parseInt(photo.height_l, 10);
						if (preload) {
							img = new Image();

							// cut out bad images
							img.onerror = function() {
								/*jshint validthis: true */
								var ims = JSON.parse(localStorage.flickrFavoriteImages);
								var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
								if (ind >= 0) {
									ims.splice(ind, 1);
									localStorage.flickrFavoriteImages = JSON.stringify(ims);
								}
							};

							img.src = photo.url_k;
							imgs.push(img);
						}

						image = {};
						image.url = photo.url_k;
						image.author = photo.ownername;
						image.asp = aspectRatio.toPrecision(3);
						images.push(image);
					}
				}
				localStorage.flickrFavoriteImages = JSON.stringify(images);
			});
	}

	// get the daily interesting photos
	function loadInteresting(preload) {
		var imgs = [], img;
		var images = [], image;
		var aspectRatio;

		var flickr = new Flickr({api_key: API_KEY});

		flickr.interestingness.getList({api_key: API_KEY,
			extras: 'owner_name,url_k,media',
			per_page: MAX_PHOTOS}, function(err, list) {
				if (err) {
					console.log(err);
					return;
				}
				for (var i = 0; i < list.photos.photo.length; i++) {
					var photo = list.photos.photo[i];
					if (photo.url_k && photo.media === 'photo' &&
						photo.isfriend !== '0' && photo.isfamily !== '0') {
						aspectRatio = parseInt(photo.width_l, 10) / parseInt(photo.height_l, 10);
						if (preload) {
							img = new Image();

							// cut out bad images
							img.onerror = function() {
								/*jshint validthis: true */
								var ims = JSON.parse(localStorage.flickrInterestingImages);
								var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
								if (ind >= 0) {
									ims.splice(ind, 1);
									localStorage.flickrInterestingImages = JSON.stringify(ims);
								}
							};

							img.src = photo.url_k;
							imgs.push(img);
						}

						image = {};
						image.url = photo.url_k;
						image.author = photo.ownername;
						image.asp = aspectRatio.toPrecision(3);
						images.push(image);
					}
				}
				localStorage.flickrInterestingImages = JSON.stringify(images);
			});
	}

	return {

		TYPE_ENUM: TYPE_ENUM,

		loadImages: function(type, preload) {
			switch (type) {
				case TYPE_ENUM.interesting:
					loadInteresting(preload);
					break;
				case TYPE_ENUM.favorite:
					loadFavorites(preload);
					break;
			}
		}
	};
})();
