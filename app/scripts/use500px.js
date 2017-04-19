/*
@@license
*/
window.app = window.app || {};
app.Use500px = (function() {
	'use strict';

	/**
	 * Interface to 500px API
	 * @namespace Use500px
	 */

	/**
	 * 500px rest API
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Use500px
	 */
	const URL = 'https://api.500px.com/v1/';

	/**
	 * API authorization key
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Use500px
	 */
	const KEY = 'iyKV6i6wu0R8QUea9mIXvEsQxIF0tMRVXopwYcFC';

	/**
	 * Max photos to return - 100 is API max
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Use500px
	 */
	const MAX_PHOTOS = 100;

	/**
	 * Categories to use
	 * Make them an array to overcome 100 photo limit per call
	 * @type {Array}
	 * @const
	 * @default
	 * @private
	 * @memberOf Use500px
	 */
	const CATS = [
		'Nature,City and Architecture',
		'Landscapes,Animals',
		'Macro,Still Life,Underwater',
	];

	return {

		/**
		 * Retrieve the array of reddit photos
		 * @param {string} type name of 500px gallery
		 * @param {function} callback (error, photos) Array of photos on success
		 * @memberOf Use500px
		 */
		loadImages: function(type, callback) {
			callback = callback || function() {};
			let photos = [];
			const xhr = [];
			const done = [false, false, false];

			for (let j = 0; j < CATS.length; j++) {
				(function(index) {
					const request =
						`${URL}photos/?consumer_key=${KEY}&feature=${type}` +
						`&only=${CATS[index]}&rpp=${MAX_PHOTOS}` +
						'&sort=rating&image_size=2048';

					xhr.push(new XMLHttpRequest());

					xhr[index].onload = function() {
						const response = JSON.parse(xhr[index].response);
						if (response.error) {
							callback(response.error);
						} else {
							const images = [];
							let asp;
							for (let i = 0; i < response.photos.length; i++) {
								const photo = response.photos[i];
								if (!photo.nsfw) {
									asp = photo.width / photo.height;
									app.Utils.addImage(images,
										photo.images[0].url,
										photo.user.fullname, asp);
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

					xhr[index].onerror = function(error) {
						callback(error);
					};

					xhr[index].open('GET', request, true);
					xhr[index].send();
				})(j);
			}
		},
	};
})();
