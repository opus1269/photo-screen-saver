/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * A potential source of photos for the screensaver
	 *
	 * @param {string} useName - The key for if the source is selected
	 * @param {string} photosName - The key for the collection of photos
	 * @param {string} type - A descriptor of the photo source
	 * @param {boolean} isDaily - Should the source be updated daily
	 * @param {boolean} isArray - Is the source an Array of photo Arrays
	 * @param {string} loadObj - function wrapper, as a string
	 * @param {string} loadFn - function to load photos, as a string
	 * @param {Array} loadArgs - Arguments to the loadFn
	 * @constructor
	 * @alias app.PhotoSource
	 */
	const PhotoSource = function(useName, photosName, type, isDaily, isArray,
								loadObj, loadFn, loadArgs) {
		this.useName = useName;
		this.photosName = photosName;
		this.type = type;
		this.isDaily = isDaily;
		this.isArray = isArray;
		this.loadObj = loadObj;
		this.loadFn = loadFn;
		this.loadArgs = loadArgs || [];
	};

	window.app = window.app || {};
	app.PhotoSource = PhotoSource;

	/**
	 * A photo from a {@link app.PhotoSource}
	 * This is the photo information that is persisted.
	 *
	 * @typedef {{}} app.PhotoSource.SourcePhoto
	 * @property {string} url - The url to the photo
	 * @property {string} author - The photographer
	 * @property {number} asp - The aspect ratio of the photo
	 * @property {Object} [ex] - Additional information about the photo
	 * @property {string} [point] - geolocation 'lat lon'
	 */

	/**
	 * The photos for a {@link app.PhotoSource}
	 *
	 * @typedef {{}} app.PhotoSource.SourcePhotos
	 * @property {string} type - type of {@link app.PhotoSource}
	 * @property {app.PhotoSource.SourcePhoto[]} photos - The photos
	 */

	/**
	 * Array of PhotoSources
	 * @private
	 * @type {app.PhotoSource[]}
	 */
	PhotoSource._SRCS = [
		new PhotoSource('useGoogle', 'albumSelections', 'Google User',
			true, true, 'GooglePhotos', 'loadPhotos', []),
		new PhotoSource('useChromecast', 'ccImages', 'Google',
			false, false, 'ChromeCast', 'loadPhotos', []),
		new PhotoSource('useEditors500px', 'editors500pxImages', '500',
			true, false, 'Use500px', 'loadPhotos', ['editors']),
		new PhotoSource('usePopular500px', 'popular500pxImages', '500',
			true, false, 'Use500px', 'loadPhotos', ['popular']),
		new PhotoSource('useYesterday500px', 'yesterday500pxImages', '500',
			true, false, 'Use500px', 'loadPhotos', ['fresh_yesterday']),
		new PhotoSource('useSpaceReddit', 'spaceRedditImages', 'reddit',
			true, false, 'Reddit', 'loadPhotos', ['r/spaceporn/']),
		new PhotoSource('useEarthReddit', 'earthRedditImages', 'reddit',
			true, false, 'Reddit', 'loadPhotos', ['r/EarthPorn/']),
		new PhotoSource('useAnimalReddit', 'animalRedditImages', 'reddit',
			true, false, 'Reddit', 'loadPhotos', ['r/animalporn/']),
		new PhotoSource('useInterestingFlickr', 'flickrInterestingImages',
			'flickr', true, false, 'Flickr', 'loadPhotos', []),
		new PhotoSource('useAuthors', 'authorImages', 'flickr',
			false, false, 'Flickr', 'loadAuthorPhotos', []),
	];

	/**
	 * Determine if this source has been selected for display
	 * @returns {boolean} true if selected
	 */
	PhotoSource.prototype.use = function() {
		return app.Storage.getBool(this.useName);
	};

	/**
	 * Process the photo source.
	 * This normally requires a https call and may fail for various reasons
	 * @returns {Promise<void>} void
	 */
	PhotoSource.prototype.process = function() {
		if (this.use()) {
			// convert string to function
			const fn = window.app[this.loadObj][this.loadFn];
			let arg = null;
			if (this.loadArgs.length === 1) {
				arg = this.loadArgs[0];
			}
			return fn(arg).then((photos) => {
				const err = this._savePhotos(photos);
				if (err) {
					throw new Error(err);
				}
				return Promise.resolve();
			}).catch((err) => {
				if (err.message === app.Utils.localize('err_network')) {
					app.GA.error(err.message, 'PhotoSource.process');
				} else {
					app.GA.error(err.message,
						`PhotoSource.process(${this.useName})`);
				}
				return Promise.reject(err);
			});
		} else {
			if (this.useName !== 'useGoogle') {
				localStorage.removeItem(this.photosName);
			}
			return Promise.resolve();
		}
	};

	/**
	 * Save the photos to localStorage in a safe manner
	 * @param {app.PhotoSource.SourcePhoto[]} photos
	 * - {@link app.PhotoSource.SourcePhoto} Array
	 * @returns {?string} non-null on error
	 * @private
	 */
	PhotoSource.prototype._savePhotos = function(photos) {
		let ret = null;
		const keyBool = (this.useName === 'useGoogle') ? null : this.useName;
		if (photos || photos.length) {
			const set = app.Storage.safeSet(this.photosName, photos, keyBool);
			if (!set) {
				ret = 'Exceeded storage capacity.';
			}
		}
		return ret;
	};

	/**
	 * Get the photos from local storage
	 * @returns {app.PhotoSource.SourcePhotos} the photos
	 * @private
	 */
	PhotoSource.prototype._getPhotos = function() {
		let ret = {
			type: this.type,
			photos: [],
		};
		if (this.use()) {
			let photos = [];
			if (this.isArray) {
				let items = app.Storage.get(this.photosName);
				// could be that items have not been retrieved yet
				items = items || [];
				items.forEach((item) => {
					photos = photos.concat(item.photos);
				});
			} else {
				photos = app.Storage.get(this.photosName);
				// could be that items have not been retrieved yet
				photos = photos || [];
			}
			ret.photos = photos;
		}
		return ret;
	};

	/**
	 * Get all the keys of useage boolean variables
	 * @returns {string[]} Array of keys of useage boolean variables
	 */
	PhotoSource.getUseNames = function() {
		let ret = [];
		PhotoSource._SRCS.forEach((source) => {
			ret = ret.concat(source.useName);
		});
		return ret;
	};

	/**
	 * Get all the photos from all selected sources. These will be
	 * used by the screensaver.
	 * @returns {app.PhotoSource.SourcePhotos[]} Array of sources photos
	 */
	PhotoSource.getSelectedPhotos = function() {
		let ret = [];
		PhotoSource._SRCS.forEach((source) => {
			ret.push(source._getPhotos());
		});
		return ret;
	};

	/**
	 * Determine if a given string is a photo source
	 * @param {string} useName - String to check
	 * @returns {boolean} true if photo source
	 */
	PhotoSource.contains = function(useName) {
		for (let i = 0; i < PhotoSource._SRCS.length; i++) {
			if (PhotoSource._SRCS[i].useName === useName) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Process the given photo source and save to localStorage.
	 * This normally requires a https call and may fail for various reasons
	 * @param {string} useName - The photo source to retrieve
	 * @returns {Promise<void>} void
	 */
	PhotoSource.process = function(useName) {
		for (let i = 0; i < PhotoSource._SRCS.length; i++) {
			if (PhotoSource._SRCS[i].useName === useName) {
				return PhotoSource._SRCS[i].process();
			}
		}
		// not found, shouldn't be here
		return Promise.resolve();
	};

	/**
	 * Process all the selected photo sources.
	 * This normally requires a https call and may fail for various reasons
	 */
	PhotoSource.processAll = function() {
		PhotoSource._SRCS.forEach((source) => {
			source.process().catch(() => {});
		});
	};

	/**
	 * Process all the selected photo sources that are to be
	 * updated every day.
	 * This normally requires a https call and may fail for various reasons
	 */
	PhotoSource.processDaily = function() {
		PhotoSource._SRCS.forEach((source) => {
			if (source.isDaily) {
				source.process().catch(() => {});
			}
		});
	};

	/**
	 * Get a geo point string from a latitude and longitude
	 * @param {number} lat - latitude
	 * @param {number} lon - longitude
	 * @returns {string} 'lat lon'
	 */
	PhotoSource.getPt = function(lat, lon) {
		if ((typeof lat === 'number') && (typeof lon === 'number')) {
			return `${lat.toPrecision(8)} ${lon.toPrecision(8)}`;
		} else {
			return `${lat} ${lon}`;
		}
	};

	/**
	 * Add a {@link app.PhotoSource.SourcePhoto} to an existing Array
	 * @param {Array} photos - {@link app.PhotoSource.SourcePhoto} Array
	 * @param {string} url - The url to the photo
	 * @param {string} author - The photographer
	 * @param {number} asp - The aspect ratio of the photo
	 * @param {Object} [ex] - Additional information about the photo
	 * @param {string} [point] - 'lat lon'
	 */
	PhotoSource.addPhoto = function(photos, url, author, asp, ex, point) {
		/** @type {app.PhotoSource.SourcePhoto} */
		const photo = {
			url: url,
			author: author,
			asp: asp.toPrecision(3),
		};
		if (ex) {
			photo.ex = ex;
		}
		if (point) {
			photo.point = point;
		}
		photos.push(photo);
	};
})();
