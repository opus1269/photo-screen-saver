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
	 * @param {string} useName - The key for the boolean value that indicates
	 * if the source is selected
	 * @param {string} photosName - The key for the collection of photos
	 * @param {string} type - A descriptor of the photo source
	 * @param {boolean} isDaily - Should the source be updated daily
	 * @param {boolean} isArray - Is the source an Array of photo Arrays
	 * @param {string} loadObj - the function wrapper for a photo source
	 * as a string
	 * @param {string} loadFn - function to call to retrieve the photo
	 * collection as a string
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
	 * @typedef {{}} app.PhotoSource.Photo
	 * @property {string} url - The url to the photo
	 * @property {string} author - The photographer
	 * @property {number} asp - The aspect ratio of the photo
	 * @property {Object} [ex] - Additional information about the photo
	 * @property {string} [point] - geolocation 'lat lon's
	 * @property {string} type - source of the photo (not persisted)
	 */

	/**
	 * Determine if this source has been selected for display
	 * @returns {boolean} true if selected
	 */
	PhotoSource.prototype.use = function() {
		return app.Storage.getBool(this.useName);
	};

	/**
	 * Process the photo source.
	 * This normally requires a https call
	 * and may fail for various reasons
	 * Save to localStorage if there is enough room.
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
	 * @param {Array} photos - {@link app.PhotoSource.Photo} Array
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
	 * Add the type (source of the photo) for each
	 * {@link app.PhotoSource.Photo} object in the array
	 * @param {Array} arr - {@link app.PhotoSource.Photo} Array
	 * @private
	 */
	PhotoSource.prototype._addType = function(arr) {
		arr.forEach((item) => {
			item.type = this.type;
		});
	};

	/**
	 * Get all the photos from local storage
	 * @returns {Array} {@link app.PhotoSource.Photo} Array
	 * @private
	 */
	PhotoSource.prototype._getPhotos = function() {
		let ret = [];
		if (this.use()) {
			if (this.isArray) {
				let items = app.Storage.get(this.photosName);
				// could be that items have not been retrieved yet
				items = items || [];
				items.forEach((item) => {
					ret = ret.concat(item.photos);
				});
				this._addType(ret);
			} else {
				ret = app.Storage.get(this.photosName);
				// could be that items have not been retrieved yet
				ret = ret || [];
				this._addType(ret);
			}
		}
		return ret;
	};

	/**
	 * Array of PhotoSources
	 * @type {app.PhotoSource[]}
	 */
	PhotoSource.SOURCES = [
		new PhotoSource('useGoogle', 'albumSelections', 'Google User',
			true, true, 'GooglePhotos', 'loadImages', []),
		new PhotoSource('useChromecast', 'ccImages', 'Google',
			false, false, 'ChromeCast', 'loadImages', []),
		new PhotoSource('useEditors500px', 'editors500pxImages', '500',
			true, false, 'Use500px', 'loadImages', ['editors']),
		new PhotoSource('usePopular500px', 'popular500pxImages', '500',
			true, false, 'Use500px', 'loadImages', ['popular']),
		new PhotoSource('useYesterday500px', 'yesterday500pxImages', '500',
			true, false, 'Use500px', 'loadImages', ['fresh_yesterday']),
		new PhotoSource('useSpaceReddit', 'spaceRedditImages', 'reddit',
			true, false, 'Reddit', 'loadImages', ['r/spaceporn/']),
		new PhotoSource('useEarthReddit', 'earthRedditImages', 'reddit',
			true, false, 'Reddit', 'loadImages', ['r/EarthPorn/']),
		new PhotoSource('useAnimalReddit', 'animalRedditImages', 'reddit',
			true, false, 'Reddit', 'loadImages', ['r/animalporn/']),
		new PhotoSource('useInterestingFlickr', 'flickrInterestingImages',
			'flickr', true, false, 'Flickr', 'loadImages', []),
		new PhotoSource('useAuthors', 'authorImages', 'flickr',
			false, false, 'Flickr', 'loadAuthorImages', []),
	];

	/**
	 * Get all the keys of useage boolean variables
	 * @returns {Array<string>} Array of keys of useage boolean variables
	 */
	PhotoSource.getUseNames = function() {
		let ret = [];
		PhotoSource.SOURCES.forEach((source) => {
			ret = ret.concat(source.useName);
		});
		return ret;
	};

	/**
	 * Get all the photos from all selected sources. These will be
	 * used by the screensaver.
	 * @returns {Array<app.PhotoSource.Photo>}
	 * {@link app.PhotoSource.Photo} Array
	 */
	PhotoSource.getSelectedPhotos = function() {
		let ret = [];
		PhotoSource.SOURCES.forEach((source) => {
			ret = ret.concat(source._getPhotos());
		});
		return ret;
	};

	/**
	 * Determine if a given string is a photo source
	 * @param {string} useName - String to check
	 * @returns {boolean} true if photo source
	 */
	PhotoSource.contains = function(useName) {
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			if (PhotoSource.SOURCES[i].useName === useName) {
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
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			if (PhotoSource.SOURCES[i].useName === useName) {
				return PhotoSource.SOURCES[i].process();
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
		PhotoSource.SOURCES.forEach((source) => {
			source.process().catch(() => {});
		});
	};

	/**
	 * Process all the selected photo sources that are to be
	 * updated every day.
	 * This normally requires a https call and may fail for various reasons
	 */
	PhotoSource.processDaily = function() {
		PhotoSource.SOURCES.forEach((source) => {
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
	 * Add a {@link app.PhotoSource.Photo} to an existing Array
	 * @param {Array} photos - {@link app.PhotoSource.Photo} Array
	 * @param {string} url - The url to the photo
	 * @param {string} author - The photographer
	 * @param {number} asp - The aspect ratio of the photo
	 * @param {Object} [ex] - Additional information about the photo
	 * @param {string} [point] - 'lat lon'
	 * @memberOf app.Utils
	 */
	PhotoSource.addImage = function(photos, url, author, asp, ex, point) {
		/** @type {app.PhotoSource.Photo} */
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
