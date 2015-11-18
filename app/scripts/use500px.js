/*
@@license
*/
/*exported use500px*/
var use500px = (function() {
	'use strict';

	var URL = 'https://api.500px.com/v1/';
	var KEY = 'iyKV6i6wu0R8QUea9mIXvEsQxIF0tMRVXopwYcFC';
	var MAX_PHOTOS = 100; // 100 is api max
	// categroies to use - we make them an array to overcome 100 photo limit per call
	var CATS = ['Nature,City and Architecture', 'Landscapes,Animals', 'Macro,Still Life,Underwater'];
	var xhr = [];

	return {

		loadImages: function(type, name) {

			for (var j = 0; j < CATS.length; j++) {
				(function(index) {
					var request = URL + 'photos/' + '?consumer_key=' + KEY +
						'&feature=' + type + '&only=' + CATS[index] + '&rpp=' + MAX_PHOTOS +
						'&sort=rating' + '&image_size=2048';

					xhr.push(new XMLHttpRequest());

					xhr[index].onload = function() {
						var response = JSON.parse(xhr[index].response);
						var images = [], image;
						var aspectRatio;
						for (var i = 0; i < response.photos.length; i++) {
							var photo = response.photos[i];
							if (!photo.nsfw) {
								aspectRatio = photo.width / photo.height;
								image = {};
								image.url = photo.images[0].url;
								image.author = photo.user.fullname;
								image.asp = aspectRatio.toPrecision(3);
								images.push(image);
							}
						}
						var tmp = [];
						if (localStorage.getItem(name)) {
							tmp = JSON.parse(localStorage.getItem(name));
							tmp = tmp.concat(images);
							myUtils.shuffleArray(tmp);
						} else {
							tmp = images;
						}
						localStorage.setItem(name, JSON.stringify(tmp));
					};

					xhr[index].onerror = function(e) {
						console.log('xhr',index,e);
					};

					xhr[index].open('GET', request, true);
					xhr[index].send();
				})(j);
			}
		}
	};
})();
