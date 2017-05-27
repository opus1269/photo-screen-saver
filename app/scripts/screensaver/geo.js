/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Handle interaction the Google maps geocode API
 * @namespace
 */
app.Geo = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Path to Google's geocode api
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Geo
	 */
	const _GEOCODE_API =
		'http://maps.googleapis.com/maps/api/geocode/json';

	/**
	 * A Geo location
	 * @typedef {Object} app.Geo.Location
	 * @property {string} loc - descriptive location
	 * @property {string} point - geo location 'lat lon'
	 * @memberOf app.Geo
	 */

	/**
	 * Cache of Geo Locations
	 * @typedef {Object} app.Geo.Cache
	 * @property {app.Geo.Location[]} entries - Array of locations
	 * @property {int} maxSize - max entries to cache
	 * @memberOf app.Geo
	 */

	/**
	 * Location cache
	 * @type {app.Geo.Cache}
	 * @private
	 * @memberOf app.Geo
	 */
	const _LOC_CACHE = {
		entries: [],
		maxSize: 50,
	};

	/**
	 * Try to get (@link app.Geo.Location} from cache
	 * @param {string} point - a geolocation
	 * @returns {app.Geo.Location|undefined} location, undefined if not cached
	 * @memberOf app.Geo
	 * @private
	 */
	function _getFromCache(point) {
		return _LOC_CACHE.entries.find((element) => {
			return (element.point === point);
		});
	}

	/**
	 * Try to get (@link app.Geo.Location} from cache
	 * @param {string} point - a geolocation
	 * @param {string} location - description
	 * @memberOf app.Geo
	 * @private
	 */
	function _addToCache(point, location) {
		_LOC_CACHE.entries.push({
			loc: location,
			point: point,
		});
		if (_LOC_CACHE.entries.length > _LOC_CACHE.maxSize) {
			// FIFO
			_LOC_CACHE.entries.shift();
		}
	}

	return {
		/**
		 * Get and set the location string
		 * @param {app.PhotoView.Elements} els - animated pages elements
		 * @memberOf app.Geo
		 */
		set: function(els) {
			if (!app.Storage.getBool('showLocation')) {
				return;
			} else if (!(els.item && els.item.point && !els.item.location)) {
				return;
			}

			// has location and hasn't been set yet
			/** @type {string} */
			const point = els.item.point;
			const cache = _getFromCache(point);
			if (cache) {
				// retrieve from cache
				els.model.set('item.location', cache.loc);
				return;
			}

			// get from api - it will translate based on the browser language
			const url = `${_GEOCODE_API}?sensor=true` +
				`&latlng=${point.replace(' ', ',')}`;
			app.Http.doGet(url, false, false, false, true, 2).then((resp) => {
				if ((resp.status === 'OK') && resp.results
					&& (resp.results.length > 0)) {
					const location = resp.results[0].formatted_address;
					els.model.set('item.location', location);
					// cache it
					_addToCache(point, location);
				}
				return Promise.resolve();
			}).catch((err) => {
				const networkErr = app.Utils.localize('err_network');
				if (!err.message.includes(networkErr)) {
					app.GA.error(err.message, 'Geo.set');
				}
				els.model.set('item.location', null);
			});
		},
	};
})();