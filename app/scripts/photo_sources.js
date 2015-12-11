/*
@@license
*/
/*exported photoSources*/
var photoSources = (function() {
	'use strict';

	// a provider of photos for the screensaver
	var PhotoSource = function(useName, photosName, type, rem, isDaily, isArray, loadFn, loadArgs) {
		this.useName = useName;
		this.photosName = photosName;
		this.type = type;
		this.rem = rem;
		this.isDaily = isDaily;
		this.isArray = isArray;
		this.loadFn = loadFn;
		this.loadArgs = loadArgs || null;
	};
	PhotoSource.prototype.use = function() {
		return JSON.parse(localStorage.getItem(this.useName));
	};
	PhotoSource.prototype.process = function() {
		if (this.rem) {
			localStorage.removeItem(this.photosName);
		}
		if (this.use()) {
			this.loadFn.apply(this, this.loadArgs);
		}
	};
	PhotoSource.prototype._addType = function(arr) {
		for (var i = 0; i < arr.length; i++) {
			arr[i].type = this.type;
		}
	};
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
		new PhotoSource('useGoogle', 'albumSelections','Google User', false, true, true, gPhotos.updateImages, null),
		new PhotoSource('useChromecast', 'ccImages','Google', true, false, false, chromeCast.loadImages, null),
		new PhotoSource('useEditors500px', 'editors500pxImages','500', true, true, false, use500px.loadImages, ['editors', 'editors500pxImages']),
		new PhotoSource('usePopular500px', 'popular500pxImages','500', true, true, false, use500px.loadImages, ['popular', 'popular500pxImages']),
		new PhotoSource('useYesterday500px', 'yesterday500pxImages','500', true, true, false, use500px.loadImages, ['fresh_yesterday', 'yesterday500pxImages']),
		new PhotoSource('useSpaceReddit', 'spaceRedditImages','reddit', true, true, false, reddit.loadImages, ['r/spaceporn/', 'spaceRedditImages']),
		new PhotoSource('useEarthReddit', 'earthRedditImages','reddit', true, true, false, reddit.loadImages, ['r/EarthPorn/', 'earthRedditImages']),
		new PhotoSource('useAnimalReddit', 'animalRedditImages','reddit', true, true, false, reddit.loadImages, ['r/animalporn/', 'animalRedditImages']),
		new PhotoSource('useInterestingFlickr', 'flickrInterestingImages','flickr', true, true, false, flickr.loadImages, null),
		new PhotoSource('useAuthors', 'authorImages','Google', true, false, false, gPhotos.loadAuthorImages, null)
	];

	return {

		// return all photo sources
		getAll: function() {
			return SOURCES;
		},

		// return all photos from all sources
		getAllPhotos: function() {
			var ret = [];
			for (var i = 0; i < SOURCES.length; i++) {
				ret = ret.concat(SOURCES[i].getPhotos());
			}
			return ret;
		},

		// return true is useName is a photoSource
		contains: function(useName) {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].useName === useName) {
					return true;
				}
			}
			return false;
		},

		// process the given photo source
		process: function(useName) {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].useName === useName) {
					SOURCES[i].process();
					break;
				}
			}
		},

		// process all photo sources
		processAll: function() {
			for (var i = 0; i < SOURCES.length; i++) {
				SOURCES[i].process();
			}
		},

		// process the daily updated photo sources
		processDaily: function() {
			for (var i = 0; i < SOURCES.length; i++) {
				if (SOURCES[i].isDaily) {
					SOURCES[i].process();
				}
			}
		}

	};
})();
