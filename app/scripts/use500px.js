/*exported use500px*/
var use500px = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var SDK_KEY = 'f6c33b154c30f00eaf6ca8b68a0fd89674f35d56';
	var MAX_PHOTOS = 100; // 100 is api max
	// categroies to use - we make them an array to overcome 100 photo limit per call
	var CATS = ['Animals,City and Architecture', 'Landscape,Fine Art,Macro', 'Nature,Still Life'];

	// Fisher-Yates shuffle algorithm.
	var shuffleArray = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	};

	return {

		loadImages: function(preload) {

			try {
				_500px.init({sdk_key: SDK_KEY});
			} catch (e) {}

			try {
				for (var j = 0; j < CATS.length; j++) {
					_500px.api('/photos',{feature: 'popular', only: CATS[j], rpp: MAX_PHOTOS, sort: 'rating', image_size: 2048}, function(response) {
						var imgs = [], img;
						var images = [], image;
						var aspectRatio;
						for (var i = 0; i < response.data.photos.length; i++) {
							var photo = response.data.photos[i];
							if (!photo.nsfw) {
								if (preload) {
									img = new Image();

									// cut out bad images
									img.onerror = function() {
										/*jshint validthis: true */
										var ims = JSON.parse(localStorage.popular500pxImages);
										var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
										if (ind >= 0) {
											ims.splice(ind, 1);
											localStorage.popular500pxImages = JSON.stringify(ims);
										}
									};
									img.src = photo.images[0].url;
									imgs.push(img);
								}						

								aspectRatio = photo.width / photo.height;
								image = {};
								image.url = photo.images[0].url;
								image.author = photo.user.fullname;
								image.asp = aspectRatio.toPrecision(3);
								images.push(image);
							}
						}
						var tmp = [];
						if (localStorage.popular500pxImages) {
							tmp = JSON.parse(localStorage.popular500pxImages);
							tmp = tmp.concat(images);
							shuffleArray(tmp);
						} else {
							tmp = images;
						}
						localStorage.popular500pxImages = JSON.stringify(tmp);
					});
				}
			} catch (e) {console.log(e);}
		}
	};
})();
