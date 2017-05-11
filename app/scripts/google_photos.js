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
app.GooglePhotos = (function() {
	'use strict';

	/**
	 * Interface to Picasa API
	 * @namespace app.GooglePhotos
	 */

	/**
	 * Path to Picasa API
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	const PICASA_URI = 'https://picasaweb.google.com/data/feed/api/user/';

	/**
	 * Query for photos
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	const PHOTOS_QUERY =
		'?imgmax=1600&thumbsize=72' +
		'&fields=entry(media:group/media:content,media:group/media:credit)' +
		'&v=2&alt=json';

	/**
	 * Max retries for failed Web request
	 * @type {int}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	const MAX_RETRY = 3;

	/**
	 * Perform an http request using OAuth 2.0 authentication
	 * @param {string} method - request type "POST" "GET" etc.
	 * @param {string} url - url to call
	 * @param {function} callback (error, httpStatus, responseText)
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function _authenticatedXhr(method, url, callback) {
		callback = callback || function() {};
		let retryToken = true;
		let retryError = 0;
		let error = null;

		(function getTokenAndXhr() {
			chrome.identity.getAuthToken({'interactive': true},
											function(accessToken) {
				if (chrome.runtime.lastError) {
					callback(chrome.runtime.lastError.message);
					return;
				}

				const xhr = new XMLHttpRequest();
				xhr.open(method, url);
				xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
				xhr.send();

				xhr.onload = function() {
					if ((this.status === 401) && retryToken) {
						// This status may indicate that the cached
						// access token was invalid. Retry with a fresh token.
						retryToken = false;
						chrome.identity.removeCachedAuthToken({
							'token': accessToken,
						}, getTokenAndXhr);
						return;
					}

					if ((this.status !== 200) && (retryError < MAX_RETRY)) {
						// Some error, retry a few times
						retryError++;
						getTokenAndXhr();
						return;
					}

					if (this.status !== 200) {
						error =
							'<strong>Server status: ' + this.status +
							'</strong><p>' + this.responseText + '</p>';
					}
					callback(error, this.status, this.responseText);
				};

				xhr.onerror = function() {
					let error =
						'<strong>Network Request: Unknown error</strong>';
					if (chrome.runtime.lastError) {
						error = chrome.runtime.lastError.message;
					}
					callback(error);
				};
			});

		})();
	}

	/** Determine if a Picasa entry is an image
	 * @param {Object} entry - Picasa media object
	 * @return {boolean} true if entry is a photo
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function _isImage(entry) {
		const content = entry.media$group.media$content;
		for (let i = 0; i < content.length; i++) {
			if (content[i].medium !== 'image') {
				return false;
			}
		}
		return true;
	}

	/**
	 * Extract the Picasa photos into an Array
	 * @param {Object} root - root object from Picasa API call
	 * @return {Array} Array of photo objects
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function _processPhotos(root) {
		const feed = root.feed;
		const entries = feed.entry || [];
		let entry;
		const photos = [];
		let url;
		let author;
		let width;
		let height;
		let asp;

		for (let i = 0; i < entries.length; i++) {
			entry = entries[i];
			if (_isImage(entry)) {
				url = entry.media$group.media$content[0].url;
				width = entry.media$group.media$content[0].width;
				height = entry.media$group.media$content[0].height;
				asp = width / height;
				author = entry.media$group.media$credit[0].$t;
				app.Utils.addImage(photos, url, author, asp);
			}
		}
		return photos;
	}

	/**
	 * Retrieve the photos for the given album id
	 * @param {int} id - Picasa album id
	 * @param {function} callback (error, photos)
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function loadPicasaAlbum(id, callback) {
		callback = callback || function() {};
		const request = `${PICASA_URI}default/albumid/${id}/${PHOTOS_QUERY}`;

		_authenticatedXhr('GET', request, function(error, status, response) {
			if (error) {
				callback(error);
			} else {
				callback(null, _processPhotos(JSON.parse(response)));
			}
		});
	}

	return {

		/**
		 * Get my photo album
		 * @param {function} callback (error, photos)
		 * @memberOf app.GooglePhotos
		 */
		loadAuthorImages: function(callback) {
			callback = callback || function() {};
			const id = '103839696200462383083';
			const album = '6117481612859013089';
			const request =
				`${PICASA_URI}${id}/albumid/${album}/${PHOTOS_QUERY}`;
			const xhr = new XMLHttpRequest();

			xhr.onload = function() {
				if (xhr.status === 200) {
					const photos = _processPhotos(JSON.parse(xhr.responseText));
					callback(null, photos);
				} else {
					callback(xhr.responseText);
				}
			};

			xhr.onerror = function(error) {
				callback(error);
			};

			xhr.open('GET', request, true);
			xhr.send();
		},

		/**
		 * Retrieve the users list of albums, including the photos in each
		 * @param {function} callback (error, albumList)
		 * @memberOf app.GooglePhotos
		 */
		loadAlbumList: function(callback) {
			callback = callback || function() {};
			const query =
				'?v=2&thumbsize=72' +
				'&max-results=20000&visibility=all&kind=album&alt=json';
			const request = `${PICASA_URI}default/${query}`;

			_authenticatedXhr('GET', request, function(error, stat, response) {
				if (error) {
					callback(error);
					return;
				}

				const root = JSON.parse(response);
				const feed = root.feed;
				const entries = feed.entry || [];
				const albumList = [];
				let album;
				let ct = 0;

				for (let i = 0; i < entries.length; ++i) {
					(function(index) {
						loadPicasaAlbum(entries[index].gphoto$id.$t,
							function(error, photos) {
							if (error) {
								callback(error);
								return;
							}

							if (!entries[index].gphoto$albumType &&
								photos.length) {
								album = {};
								album.index = index;
								album.uid = 'album' + index;
								album.name = entries[index].title.$t;
								album.id = entries[index].gphoto$id.$t;
								album.ct = photos.length;
								album.thumb =
									entries[index]
										.media$group.media$thumbnail[0].url;
								album.checked = false;
								album.photos = photos;
								albumList.push(album);
							}
							if (ct === (entries.length - 1)) {
								if (albumList) {
									albumList.sort(function(a, b) {
										return a.index - b.index;
									});
									// renumber
									for (let j = 0; j < albumList.length; j++) {
										albumList[j].index = j;
										albumList[j].uid = 'album' + j;
									}
								}
								callback(null, albumList);
							}
							ct++;
						});
					})(i);
				}
			});
		},

		/**
		 * Retrieve the photos in the selected albums
		 * @param {function} callback (error, items)
		 * Array of Array of album photos on success
		 * @memberOf app.GooglePhotos
		 */
		loadImages: function(callback) {
			callback = callback || function() {};
			let ct = 0;
			const items = app.Utils.get('albumSelections');
			const newItems = [];

			for (let i = 0; i < items.length; i++) {
				(function(index) {
					loadPicasaAlbum(items[index].id, function(error, photos) {
						if (photos && photos.length) {
							newItems.push({
								id: items[index].id,
								photos: photos,
							});
						}

						if (ct === (items.length - 1)) {
							// done
							callback(null, newItems);
							return;
						}
						ct++;
					});
				})(i);
			}
		},
	};
})();
