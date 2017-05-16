/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
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
	const _URL_BASE = 'https://picasaweb.google.com/data/feed/api/user/';

	/**
	 * Query an album
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	const _ALBUM_QUERY = '?imgmax=1600&thumbsize=72' +
		'&fields=title,gphoto:id,entry(media:group/media:content,' +
		'media:group/media:credit,media:group/media:thumbnail)&v=2&alt=json';

	/** Determine if a Picasa entry is an image
	 * @param {Object} entry - Picasa media object
	 * @returns {boolean} true if entry is a photo
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
	 * @returns {Array} Array of photo objects
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function _processPhotos(root) {
		const feed = root.feed;
		const entries = feed.entry || [];
		const photos = [];

		for (let i = 0; i < entries.length; i++) {
			let entry = entries[i];
			if (_isImage(entry)) {
				const url = entry.media$group.media$content[0].url;
				const width = entry.media$group.media$content[0].width;
				const height = entry.media$group.media$content[0].height;
				const asp = width / height;
				const author = entry.media$group.media$credit[0].$t;
				app.Utils.addImage(photos, url, author, asp);
			}
		}
		return photos;
	}

	/**
	 * Retrieve a Google Photos album
	 * @param {string} albumId - Picasa album ID
	 * @param {string} [userId='default'] - userId for non-authenticated request
	 * @returns {Promise<Object>} Root object from Picasa call
	 * @private
	 * @memberOf app.GooglePhotos
	 */
	function _loadPicasaAlbum(albumId, userId = 'default') {
		const url = `${_URL_BASE}${userId}/albumid/${albumId}/${_ALBUM_QUERY}`;
		let isAuth = false;
		let isRetry = false;
		if (userId === 'default') {
			isRetry = true;
			isAuth = true;
		}
		return app.Http.doGet(url, isAuth, isRetry);
	}

	return {
		/**
		 * Get my photo album
		 * @returns {Promise<Photo[]>} Array of {@link Photo} objects
		 * @memberOf app.GooglePhotos
		 */
		loadAuthorImages: function() {
			const albumId = '6117481612859013089';
			const userId = '103839696200462383083';
			return _loadPicasaAlbum(albumId, userId).then((root) => {
				const photos = _processPhotos(root);
				if (photos && photos.length) {
					return Promise.resolve(photos);
				}
				throw new Error('No photos');
			});
		},

		/**
		 * Retrieve the users list of albums, including the photos in each
		 * @returns {Promise<Array>} Array of Arrays
		 * @memberOf app.GooglePhotos
		 */
		loadAlbumList: function() {
			const query = '?v=2' +
				'&fields=entry(gphoto:albumType,gphoto:id)' +
				'&max-results=20000&visibility=all&kind=album&alt=json';
			const url = `${_URL_BASE}default/${query}`;

			// get list of albums
			return app.Http.doGet(url, true, false).then((root) => {
				const feed = root.feed;
				const entries = feed.entry || [];

				// series of API calls to get each album
				const promises = [];
				for (let i = 0; i < entries.length; i++) {
					const entry = entries[i];
					if (!entry.gphoto$albumType) {
						const albumId = entry.gphoto$id.$t;
						promises.push(
							_loadPicasaAlbum(albumId).catch(() => {})
						);
					}
				}

				// Collate the albums
				return Promise.all(promises).then((values) => {
					let albums = [];
					let ct = 0;
					values.forEach((value) => {
						const feed = value.feed;
						const thumb =
							feed.entry[0].media$group.media$thumbnail[0].url;
						const photos = _processPhotos(value);
						if (photos && photos.length) {
							const album = {
								index: ct,
								uid: 'album' + ct,
								name: feed.title.$t,
								id: feed.gphoto$id.$t,
								ct: photos.length,
								thumb: thumb,
								checked: false,
								photos: photos,
							};
							albums.push(album);
							ct++;
						}
					});
					return Promise.resolve(albums);
				});
			});
		},

		/**
		 * Retrieve the photos in the selected albums
		 * Array of Array of album photos on success
		 * @returns {Promise<Array>} Array of Array of albums
		 * @memberOf app.GooglePhotos
		 */
		loadImages: function() {
			const items = app.Storage.get('albumSelections');

			// series of API calls to get each album
			const promises = [];
			for (let i = 0; i < items.length; i++) {
				const albumId = items[i].id;
				promises.push(_loadPicasaAlbum(albumId).catch(() =>{}));
			}

			// Collate the albums
			return Promise.all(promises).then((values) => {
				const albums = [];
				values.forEach((value) => {
					const feed = value.feed;
					const photos = _processPhotos(value);
					if (photos && photos.length) {
						albums.push({id: feed.gphoto$id.$t, photos: photos});
					}
				});
				return Promise.resolve(albums);
			});
		},
	};
})();
