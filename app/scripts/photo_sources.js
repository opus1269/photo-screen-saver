/*
@@license
*/
/*exported photoSources*/
var photoSources = (function() {
	'use strict';

	/**
	 * A potential source of photos for the screen saver
	 *
	 * @param {String} useName The key for the boolean value that indicates if the source is selected
	 * @param {String} photosName The key for the collection of photos
	 * @param {String} type A descriptor of the photo source
	 * @param {Boolean} isDaily Should the source be updated daily
	 * @param {Boolean} isArray Is the source an Array of photo Arrays
	 * @param {String} loadObj the function wrapper for a photo source as a string
	 * @param {String} loadFn function to call to retrieve the photo collection as a string
	 * @param {Array} loadArgs Arguments to the loadFn
	 * @constructor
	 *
	 */
	var PhotoSource = function(useName, photosName, type, isDaily, isArray, loadObj, loadFn, loadArgs) {
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
	 *
	 * @return {Boolean} true is selected
	 */
	PhotoSource.prototype.use = function() {
		return myUtils.getBool(this.useName);
	};

	/**
	 * Process the given photo source.
	 * This normally requires a https call
	 * and may fail for various reasons
	 * Save to localStorage if there is enough room.
	 *
	 * @param {function} callback (error) non-null on error
	 */
	PhotoSource.prototype.process = function(callback) {
		// callback(error)
		callback = callback || function() {};

		if (this.use()) {
			var self = this;
			var err = null;
			// convert string to function
			var fn = window[this.loadObj][this.loadFn];
			if (this.loadArgs.length === 1) {
				fn(this.loadArgs[0], function(error, photos) {
					err = self._savePhotos(error, photos);
				});
			} else {
				fn(function(error, photos) {
					err = self._savePhotos(error, photos);
				});
			}
			callback(err);
			return;
		} else {
			if (this.useName !== 'useGoogle') {
				localStorage.removeItem(this.photosName);
			}
		}
		callback(null);
	};

	/**
	 * Save the photos to localStorage in a safe manner
	 *
	 * @param {String} error non-null if retrieval failed
	 * @param {Array} photos an array of photo objects
	 *
	 * @return {String} non-null on error
	 * @private
	 */
	PhotoSource.prototype._savePhotos = function(error, photos) {
		var ret = null;
		var keyBool = (this.useName === 'useGoogle') ?  null : this.useName;
		if (error) {
			console.log('source: ', this.useName, 'error: ', error);
			ret = error;
		} else if (!photos || !photos.length) {
			ret = 'No photos retrieved.';
		} else if (!myUtils.localStorageSafeSet(this.photosName, JSON.stringify(photos), keyBool)) {
			ret = 'Exceeded storage capacity.';
		}

		return ret;
	};

	/**
	 * Add the type specifier (source of the photo) for each photo object in the array
	 *
	 * @param {Array} arr an array of photo objects
	 * @private
	 */
	PhotoSource.prototype._addType = function(arr) {
		for (var i = 0; i < arr.length; i++) {
			arr[i].type = this.type;
		}
	};

	/**
	 * Get all the photos
	 *
	 * @returns {Array} The Array of photos
	 *
	 */
	PhotoSource.prototype.getPhotos = function() {
		var ret = [];
		if (this.use()) {
			if (this.isArray) {
				var items = JSON.parse(localStorage.getItem(this.photosName));
				for (var i = 0; i < items.length; i++) {
					ret = ret.concat(items[i].photos);
					if (ret) {
						this._addType(ret);
					}
				}
			} else {
				ret = JSON.parse(localStorage.getItem(this.photosName));
				if (ret) {
					this._addType(ret);
				}
			}
		}
		return ret;
	};

	/** 
	 * Array of PhotoSources
	 * 
	 * @type {*[]}
	 */
	var SOURCES = [
		new PhotoSource('useGoogle', 'albumSelections','Google User',
			true, true, 'gPhotos', 'loadImages', []),
		new PhotoSource('useChromecast', 'ccImages','Google',
			false, false, 'chromeCast', 'loadImages', []),
		new PhotoSource('useEditors500px', 'editors500pxImages','500',
			true, false, 'use500px', 'loadImages', ['editors']),
		new PhotoSource('usePopular500px', 'popular500pxImages','500',
			true, false, 'use500px', 'loadImages', ['popular']),
		new PhotoSource('useYesterday500px', 'yesterday500pxImages','500',
			true, false, 'use500px', 'loadImages', ['fresh_yesterday']),
		new PhotoSource('useSpaceReddit', 'spaceRedditImages','reddit',
			true, false, 'reddit', 'loadImages', ['r/spaceporn/']),
		new PhotoSource('useEarthReddit', 'earthRedditImages','reddit',
			true, false, 'reddit', 'loadImages', ['r/EarthPorn/']),
		new PhotoSource('useAnimalReddit', 'animalRedditImages','reddit',
			true, false, 'reddit', 'loadImages', ['r/animalporn/']),
		new PhotoSource('useInterestingFlickr', 'flickrInterestingImages','flickr',
			true, false, 'flickr', 'loadImages', []),
		new PhotoSource('useAuthors', 'authorImages','Google',
			false, false, 'gPhotos', 'loadAuthorImages', [])
	];

	return {

		/**
		 * Get all the keys of useage boolean variables
		 *
		 * @returns {Array} Array of keys of useage boolean variables
		 */
		getUseNames: function() {
			var ret = [];
			for (var i = 0; i < SOURCES.length; i++) {
				ret = ret.concat(SOURCES[i].useName);
			}
			return ret;
		},

		/**
		 * Get all the photos from all selected sources. These will be
		 * used by the screen saver.
		 *
		 * @returns {Array} Array of photos to display in screen saver
		 */
		getSelectedPhotos: function() {
			var ret = [];
			for (var i = 0; i < SOURCES.length; i++) {
				ret = ret.concat(SOURCES[i].getPhotos());
			}
			return ret;
		},

		/**
		 * Determine if a given string is a photo source
		 *
		 * @param {String} useName String to check
		 * @returns {boolean} true if photo source
		 */
		contains: function(useName) {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].useName === useName) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Process the given photo source and save to localStorage.
		 * This normally requires a https call
		 * and may fail for various reasons
		 *
		 * @param {String} useName The photo source to retrieve
		 * @param {function} callback (error) non-null on error
		 *
		 */
		process: function(useName, callback) {
			// callback(error)
			callback = callback || function() {};

			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].useName === useName) {
					SOURCES[i].process(function(error) {
						callback(error);
					});
				}
			}
		},

		/**
		 * Process all the selected photo sources and save to localStorage.
		 * This normally requires a https call
		 * and may fail for various reasons
		 *
		 */
		processAll: function() {
			for (var i = 0; i < SOURCES.length; i++) {
				SOURCES[i].process();
			}
		},

		/**
		 * Process all the selected photo sources that are to be updated every day
		 * and save to localStorage.
		 * This normally requires a https call
		 * and may fail for various reasons
		 *
		 */
		processDaily: function() {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].isDaily) {
					SOURCES[i].process();
				}
			}
		}

	};
})();
