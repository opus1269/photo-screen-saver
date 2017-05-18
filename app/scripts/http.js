/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Fetch with authentication and exponential backoff
 * @namespace
 */
app.Http = (function() {
	'use strict';

	const chromep = new ChromePromise();

	if (typeof window.onerror === 'object') {
		// global error handler
		window.onerror = function(message, url, line, col, errObject) {
			if (app && app.GA) {
				let msg = message;
				let stack = null;
				if (errObject && errObject.message && errObject.stack) {
					msg = errObject.message;
					stack = errObject.stack;
				}
				app.GA.exception(msg, stack);
			}
		};
	}

	/**
	 * Max retries on 500 errors
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _MAX_RETRIES = 4;

	/**
	 * Delay multiplier for exponential back-off
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _DELAY = 1000;

	/**
	 * Retry call to server after removing cached auth token
	 * @param {string} url - url to call
	 * @param {string} authToken - chrome auth token
	 * @returns {Promise.<void>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retryGet(url, authToken) {
		return chromep.identity.removeCachedAuthToken({
			token: authToken,
		}).then(() => {
			return app.Http.doGet(url, true, false);
		});
	}

	/**
	 * Get auth token if requested
	 * @param {boolean} isAuth - true if authorization required
	 * @param {boolean} interactive - true if auth call is interactive
	 * @returns {Promise.<string>} auth token if needed
	 * @private
	 * @memberOf app.Http
	 */
	function _doAuth(isAuth, interactive) {
		if (isAuth) {
			return chromep.identity.getAuthToken({'interactive': interactive});
		} else {
			return Promise.resolve('');
		}
	}

	return {
		/**
		 * Perform GET request to server using exponential back-off
		 * @param {string} url - server
		 * @param {boolean} [isAuth=false] - true if authorization required
		 * @param {boolean} [retryAuth=false] - if true, retry with new token
		 * @returns {Promise.<json>} response from server
		 * @memberOf app.Http
		 */
		doGet: function(url, isAuth = false, retryAuth = false) {
			let attempts = 0;
			let token = '';
			return _doGet();

			/**
			 * Fetch with exponential back-off
			 * @returns {Promise.<json>} response from server
			 * @memberOf app.Http
			 */
			function _doGet() {
				return _doAuth(isAuth, retryAuth).then((authToken) => {
					const init = {method: 'GET', headers: new Headers({})};
					if (isAuth) {
						token = authToken;
						init.headers.append('Authorization', `Bearer ${token}`);
					}
					return fetch(url, init);
				}).then((response) => {
					const status = response.status;
					if (response.ok) {
						return response.json();
					} else if (isAuth && retryAuth &&
						(status === 401)) {
						// could be bad token. Remove cached one and try again
						return _retryGet(url, token);
					} else if ((attempts < _MAX_RETRIES) &&
						((status >= 500) && (status < 600))) {
						// temporary server issue, retryAuth with back-off
						attempts++;
						const delay = (Math.pow(2, attempts) - 1) * _DELAY;
						// eslint-disable-next-line promise/avoid-new
						return new Promise(() => {
							setTimeout(() => {
								return _doGet();
							}, delay);
						});
					} else {
						// request failed
						const statusMsg = app.Utils.localize('err_status');
						let msg = `${statusMsg}: ${status}`;
						msg+= `\n${response.statusText}`;
						throw new Error(msg);
					}
				}).then((json) => {
					return Promise.resolve(json);
				}).catch((err) => {
					if (err.message === 'Failed to fetch') {
						err.message = app.Utils.localize('err_network');
					}
					throw new Error(err.message);
				});
			}
		},
	};
})();
