/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its contributors
 *  may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 *  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 *  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 *  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 *  OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
window.app = window.app || {};
app.Flickr = (function() {
	'use strict';

	/**
	 * Interface to flickr API
	 * @namespace Flickr
	 */

	/**
	 * Flickr rest API
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Flickr
	 */
	const URL = 'https://api.flickr.com/services/rest/';

	/**
	 * Flickr rest API authorization key
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Flickr
	 */
	const KEY = '1edd9926740f0e0d01d4ecd42de60ac6';

	/**
	 * Max photos to return
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf Flickr
	 */
	const MAX_PHOTOS = 300;

	return {

		/**
		 * Retrieve flickr photos
		 * @param {function} callback (error, photos)
		 * @memberOf Flickr
		 */
		loadImages: function(callback) {
			callback = callback || function() {};
			const request =
				`${URL}?method=flickr.interestingness.getList` +
				`&api_key=${KEY}&extras=owner_name,url_k,media` +
				`&per_page=${MAX_PHOTOS}&format=json&nojsoncallback=1`;
			const xhr = new XMLHttpRequest();

			xhr.onload = function() {
				const response = JSON.parse(xhr.response);
				if (response.stat !== 'ok') {
					callback(response.message);
				} else {
					const images = [];
					for (let i = 0; i < response.photos.photo.length; i++) {
						const photo = response.photos.photo[i];
						if (photo && photo.url_k &&
							(photo.media === 'photo') &&
							(photo.isfriend !== '0') &&
							(photo.isfamily !== '0')) {
							const width = parseInt(photo.width_k, 10);
							const height = parseInt(photo.height_k, 10);
							const asp = width / height;
							app.Utils.addImage(images, photo.url_k,
								photo.ownername, asp, photo.owner);
						}
					}
					callback(null, images);
				}
			};

			xhr.onerror = function(error) {
				callback(error);
			};

			xhr.open('GET', request, true);
			xhr.send();
		},
	};
})();
