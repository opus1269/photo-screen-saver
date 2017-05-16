/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
	'use strict';

	/**
	 * A potential source of photos for the screen saver
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
	 * @alias PhotoSource
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
	 * @param {function} callback (error)
	 */
	PhotoSource.prototype.process = function(callback) {
		// callback(error)
		callback = callback || function() {};

		if (this.use()) {
			const self = this;
			let err = null;
			// convert string to function
			const fn = window.app[this.loadObj][this.loadFn];
			let arg = null;
			if (this.loadArgs.length === 1) {
				arg = this.loadArgs[0];
			}
			fn(arg).then((photos) => {
				err = self._savePhotos(photos);
				callback(err);
			}).catch((error) => {
				console.error('error', error);
				callback(error);
			});
		} else {
			if (this.useName !== 'useGoogle') {
				localStorage.removeItem(this.photosName);
			}
			callback(null);
		}
	};

	/**
	 * Save the photos to localStorage in a safe manner
	 * @param {Array} photos - an array of photo objects
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
	 * Add the type specifier (source of the photo) for each
	 * photo object in the array
	 * @param {Array} arr - an array of photo objects
	 * @private
	 */
	PhotoSource.prototype._addType = function(arr) {
		for (let i = 0; i < arr.length; i++) {
			arr[i].type = this.type;
		}
	};

	/**
	 * Get all the photos from local storage
	 * @returns {Array} The Array of photos
	 * @private
	 */
	PhotoSource.prototype._getPhotos = function() {
		let ret = [];
		if (this.use()) {
			if (this.isArray) {
				const items = app.Storage.get(this.photosName);
				if (items) {
					// could be that items have not been retrieved yet
					for (let i = 0; i < items.length; i++) {
						ret = ret.concat(items[i].photos);
						if (ret) {
							this._addType(ret);
						}
					}
				}
			} else {
				ret = app.Storage.get(this.photosName);
				if (ret) {
					this._addType(ret);
				} else {
					ret = [];
				}
			}
		}
		return ret;
	};

	/**
	 * Array of PhotoSources
	 * @type {Array}
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
		new PhotoSource('useAuthors', 'authorImages', 'Google',
			false, false, 'GooglePhotos', 'loadAuthorImages', []),
	];

	/**
	 * Get all the keys of useage boolean variables
	 * @returns {Array} Array of keys of useage boolean variables
	 */
	PhotoSource.getUseNames = function() {
		let ret = [];
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			ret = ret.concat(PhotoSource.SOURCES[i].useName);
		}
		return ret;
	};

	/**
	 * Get all the photos from all selected sources. These will be
	 * used by the screensaver.
	 * @returns {Array} Array of photos to display in screen saver
	 */
	PhotoSource.getSelectedPhotos = function() {
		let ret = [];
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			ret = ret.concat(PhotoSource.SOURCES[i]._getPhotos());
		}
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
	 * This normally requires a https call
	 * and may fail for various reasons
	 * @param {string} useName - The photo source to retrieve
	 * @param {function} callback (error) non-null on error
	 */
	PhotoSource.process = function(useName, callback) {
		// callback(error)
		callback = callback || function() {};

		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			if (PhotoSource.SOURCES[i].useName === useName) {
				PhotoSource.SOURCES[i].process(function(error) {
					callback(error);
				});
			}
		}
	};

	/**
	 * Process all the selected photo sources and save to localStorage.
	 * This normally requires a https call
	 * and may fail for various reasons
	 */
	PhotoSource.processAll = function() {
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			PhotoSource.SOURCES[i].process();
		}
	};

	/**
	 * Process all the selected photo sources that are to be
	 * updated every day and save to localStorage.
	 * This normally requires a https call
	 * and may fail for various reasons
	 */
	PhotoSource.processDaily = function() {
		for (let i = 0; i < PhotoSource.SOURCES.length; i++) {
			if (PhotoSource.SOURCES[i].isDaily) {
				PhotoSource.SOURCES[i].process();
			}
		}
	};

	window.app = window.app || {};
	app.PhotoSource = PhotoSource;
})(window);
