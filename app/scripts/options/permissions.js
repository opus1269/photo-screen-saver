/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Handle optional permissions
 *  @namespace
 */
app.Permissions = (function() {
	'use strict';

	new ExceptionHandler();

	const chromep = new ChromePromise();

	/**
	 * A permission state enum
	 * @typedef {{}} app.Permissions.State
	 * @property {string} notSet - never been allowed or denied
	 * @property {string} allowed - user allowed
	 * @property {string} denied - user denied
	 * @memberOf app.Permissions
	 */

	/**
	 * A permission type
	 * @typedef {{}} app.Permissions.Type
	 * @property {string} name - name in localStorage
	 * @property {string[]} permissions - array of permissions
	 * @property {string[]} origins - array of origins
	 * @memberOf app.Permissions
	 */

	/**
	 * Possible states of an {@link app.Permissions.Type}
	 * @type {app.Permissions.State}
	 * @const
	 * @private
	 * @memberOf app.Permissions
	 */
	const _STATE = {
		notSet: 'notSet',
		allowed: 'allowed',
		denied: 'denied',
	};

	/**
	 * Permission for access to users' Google Photos
	 * @const
	 * @type {app.Permissions.Type}
	 * @memberOf app.Permissions
	 */
	const PICASA = {
		name: 'permPicasa',
		permissions: [],
		origins: ['https://picasaweb.google.com/'],
	};

	/**
	 * Persist the state of an {@link app.Permissions.Type}
	 * @param {app.Permissions.Type} type - permission type
	 * @param {string} value - permission state
	 * @private
	 * @memberOf app.Permissions
	 */
	function _setState(type, value) {
		// send message to store value so items that are bound
		// to it will get storage event
		const msg = app.Msg.STORE;
		msg.key = type.name;
		msg.value = value;
		app.Msg.send(msg).catch(() => {});
	}

	/**
	 * Determine if we have the optional permissions
	 * @param {app.Permissions.Type} type - permission type
	 * @returns {Promise<boolean>} true if we have permissions
	 * @memberOf app.Permissions
	 */
	function _contains(type) {
		return chromep.permissions.contains({
			permissions: type.permissions,
			origins: type.origins,
		});
	}

	/**
	 * Remove the optional permissions
	 * @param {app.Permissions.Type} type - permission type
	 * @returns {Promise<boolean>} true if removed
	 * @private
	 * @memberOf app.Permissions
	 */
	function _remove(type) {
		return _contains(type).then((contains) => {
			if (contains) {
				// try to remove permission
				return chromep.permissions.remove({
					permissions: type.permissions,
					origins: type.origins,
				});
			} else {
				return Promise.resolve(false);
			}
		});
	}

	return {
		/** @type {app.Permissions.Type} */
		PICASA: PICASA,

		/**
		 * Has user made choice on permissions
		 * @param {app.Permissions.Type} type - permission type
		 * @returns {boolean} true if allowed or denied
		 * @memberOf app.Permissions
		 */
		notSet: function(type) {
			return app.Storage.get(type.name) === _STATE.notSet;
		},

		/**
		 * Has the user allowed the optional permissions
		 * @param {app.Permissions.Type} type - permission type
		 * @returns {boolean} true if allowed
		 * @memberOf app.Permissions
		 */
		isAllowed: function(type) {
			return app.Storage.get(type.name) === _STATE.allowed;
		},

		/**
		 * Request optional permission - may block
		 * @param {app.Permissions.Type} type - permission type
		 * @returns {Promise<boolean>} true if permission granted
		 * @memberOf app.Permissions
		 */
		request: function(type) {
			let isGranted;
			return chromep.permissions.request({
				permissions: type.permissions,
				origins: type.origins,
			}).then((granted) => {
				isGranted = granted;
				if (granted) {
					_setState(type, _STATE.allowed);
					return Promise.resolve();
				} else {
					_setState(type, _STATE.denied);
					// try to remove if it has been previously granted
					return _remove(type);
				}
			}).then(() => {
				return Promise.resolve(isGranted);
			});
		},
	};
})();
