/*
@@license
*/
/*exported use500px*/
var use500px = (function() {
	'use strict';

	var URL = 'https://api.500px.com/v1/';
	var KEY = 'iyKV6i6wu0R8QUea9mIXvEsQxIF0tMRVXopwYcFC';
	// 100 is api max
	var MAX_PHOTOS = 100;
	// categories to use - we make them an array to overcome 100 photo limit per call
	var CATS = ['Nature,City and Architecture', 'Landscapes,Animals', 'Macro,Still Life,Underwater'];

	return {

		/**
		 * Retrieve the array of reddit photos
		 *
		 * @param {string} type name of 500px gallery
		 * @param {function} callback error, photos) Array of photos on success
		 *
		 */
		loadImages: function(type, callback) {
			// callback(error, photos)
			callback = callback || function() {};
			
			var photos = [];
			var xhr = [];
			var done = [false, false, false];
			for (var j = 0; j < CATS.length; j++) {
				(function(index) {
					var request = URL + 'photos/' + '?consumer_key=' + KEY +
						'&feature=' + type + '&only=' + CATS[index] + '&rpp=' + MAX_PHOTOS +
						'&sort=rating' + '&image_size=2048';

					xhr.push(new XMLHttpRequest());
					xhr[index].onload = function() {
						var response = JSON.parse(xhr[index].response);
						if (response.error) {
							callback(response.error);
						} else {
							var images = [];
							var asp;
							for (var i = 0; i < response.photos.length; i++) {
								var photo = response.photos[i];
								if (!photo.nsfw) {
									asp = photo.width / photo.height;
									myUtils.addImage(images, photo.images[0].url, photo.user.fullname, asp);
								}
							}
							photos = photos.concat(images);
							done[index] = true;
							if (done[0] && done[1] && done[2]) {
								// success
								callback(null, photos);
							}
						}
					};

					xhr[index].onerror = function(e) {
						callback(e);
					};

					xhr[index].open('GET', request, true);
					xhr[index].send();
				})(j);
			}
		}
	};
})();
