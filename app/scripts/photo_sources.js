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
	 * @param {function} loadFn functions to call to process the photos
	 * @param {Array} loadArgs Arguments to the loadFn
	 * @constructor
	 *
	 */
	var PhotoSource = function(useName, photosName, type, isDaily, isArray, loadFn, loadArgs) {
		this.useName = useName;
		this.photosName = photosName;
		this.type = type;
		this.isDaily = isDaily;
		this.isArray = isArray;
		this.loadFn = loadFn;
		this.loadArgs = loadArgs || null;
	};

	/**
	 * Determine if this source has been selected for display
	 *
	 * @return {Boolean} true is selected
	 */
	PhotoSource.prototype.use = function() {
		return JSON.parse(localStorage.getItem(this.useName));
	};

	/**
	 * Process the given photo source.
	 * This normally requires a https call
	 * and may fail for various reasons
	 *
	 */
	PhotoSource.prototype.process = function() {
		if (this.use()) {
			this.loadFn.apply(this, this.loadArgs);
		} else {
			localStorage.removeItem(this.photosName);
		}
	};

	/**
	 * Add the type specifier (source of the photo) for each photo object in the array

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

	// Array of PhotoSources
	var SOURCES = [
		new PhotoSource('useGoogle', 'albumSelections','Google User', true, true, gPhotos.updateImages, null),
		new PhotoSource('useChromecast', 'ccImages','Google', false, false, chromeCast.loadImages, null),
		new PhotoSource('useEditors500px', 'editors500pxImages','500', true, false, use500px.loadImages, ['editors', 'editors500pxImages']),
		new PhotoSource('usePopular500px', 'popular500pxImages','500', true, false, use500px.loadImages, ['popular', 'popular500pxImages']),
		new PhotoSource('useYesterday500px', 'yesterday500pxImages','500', true, false, use500px.loadImages, ['fresh_yesterday', 'yesterday500pxImages']),
		new PhotoSource('useSpaceReddit', 'spaceRedditImages','reddit', true, false, reddit.loadImages, ['r/spaceporn/', 'spaceRedditImages']),
		new PhotoSource('useEarthReddit', 'earthRedditImages','reddit', true, false, reddit.loadImages, ['r/EarthPorn/', 'earthRedditImages']),
		new PhotoSource('useAnimalReddit', 'animalRedditImages','reddit', true, false, reddit.loadImages, ['r/animalporn/', 'animalRedditImages']),
		new PhotoSource('useInterestingFlickr', 'flickrInterestingImages','flickr', true, false, flickr.loadImages, null),
		new PhotoSource('useAuthors', 'authorImages','Google', false, false, gPhotos.loadAuthorImages, null)
	];

	return {

		/**
		 * Get all the photos from all selected sources. These will be
		 * used by the screen saver.
		 *
		 * @returns {Array} Array of photos to display in screen saver
		 */
		getAllPhotos: function() {
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
		 * @param useName The photo source to retrieve
		 
		 */
		process: function(useName) {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].useName === useName) {
					SOURCES[i].process();
					break;
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
