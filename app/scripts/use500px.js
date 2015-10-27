/*exported use500px*/
var use500px = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var SDK_KEY = 'f6c33b154c30f00eaf6ca8b68a0fd89674f35d56';
	var MAX_PHOTOS = 100; // 100 is api max
	var CATS = 'Animals,Landscape,City and Architecture,Fine Art,Macro,Nature,Still Life';

	return {

		preloadImages: function() {
			_500px.init({sdk_key: SDK_KEY});

			_500px.api('/photos',{feature: 'popular', only: CATS, rpp: MAX_PHOTOS, sort: 'rating', image_size: 2048}, function(response) {
				var imgs = [], img;
				var images = [], image;
				var aspectRatio;
				for (var i = 0; i < response.data.photos.length; i++) {
					var photo = response.data.photos[i];
					if (!photo.nsfw) {
						aspectRatio = photo.width / photo.height;
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

						img.src = photo.image_url;
						imgs.push(img);
						image = {};
						image.url = img.src;
						image.author = photo.user.fullname;
						image.asp = aspectRatio.toPrecision(3);
						images.push(image);
					}
				}
				localStorage.popular500pxImages = JSON.stringify(images);
			});
		}
	};
})();
