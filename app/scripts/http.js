/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Fetch with authentication and exponential back-off
 * @namespace
 */
app.Http = (function() {
	'use strict';

	new ExceptionHandler();

	const chromep = new ChromePromise();

	/**
	 * Max retries on 500 errors
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _MAX_ATTEMPTS = 3;

	/**
	 * Delay multiplier for exponential back-off
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _DELAY = 1000;

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

	/**
	 * Retry fetch with exponential back-off
	 * @param {string} url - server
	 * @param {Object} options - fetch options
	 * @param {boolean} isAuth - true if authorization required
	 * @param {boolean} retryAuth - if true, retry with new token
	 * @param {int} attempt - the retry attempt we are on
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retry(url, options, isAuth, retryAuth, attempt) {
		attempt++;
		app.GA.error(`Retry fetch: ${url}`, 'app.Http._retry');

		// eslint-disable-next-line promise/avoid-new
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				return _fetch(url, options, isAuth, retryAuth, attempt)
					.then(resolve, reject);
			}, (Math.pow(2, attempt) - 1) * _DELAY);
		});
	}

	/**
	 * Retry fetch with new auth token
	 * @param {string} url - server
	 * @param {Object} options - fetch options
	 * @param {boolean} isAuth - true if authorization required
	 * @param {string} authToken - cached auth token
	 * @param {int} attempt - the retry attempt we are on
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retryAuth(url, options, isAuth, authToken, attempt) {
		app.GA.error('Refresh auth token.', 'app.Http._retryAuth');
		return chromep.identity.removeCachedAuthToken({
			token: authToken,
		}).then(() => {
			return _fetch(url, options, isAuth, false, attempt);
		});
	}

	/**
	 * Perform fetch using exponential back-off and
	 * optionally with authorization
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {boolean} isAuth - true if authorization required
	 * @param {boolean} retryAuth - if true, retry with new token
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} backoff - if true, do exponential back-off
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _fetch(url, opts, isAuth, retryAuth, attempt, backoff) {
		let token = '';
		return _doAuth(isAuth, retryAuth).then((authToken) => {
			if (isAuth) {
				token = authToken;
				opts = {method: 'GET', headers: new Headers({})};
				opts.headers.append('Authorization',
					`Bearer ${token}`);
			}
			return fetch(url, opts);
		}).then((response) => {
			const status = response.status;

			if (response.ok) {
				// request succeeded
				return response.json();
			}

			if (attempt >= _MAX_ATTEMPTS) {
				// request failed
				const statusMsg = app.Utils.localize('err_status');
				let msg = `${statusMsg}: ${status}`;
				msg += `\n${response.statusText}`;
				return Promise.reject(new Error(msg));
			}

			if (isAuth && retryAuth && (status === 401)) {
				// could be bad token. Remove cached one and try again
				return _retryAuth(url, opts, isAuth, token, attempt);
			}

			if (backoff && (status >= 500) && (status < 600)) {
				// temporary network error, maybe. Retry
				return _retry(url, opts, isAuth, retryAuth, attempt);
			}

			// request failed
			const statusMsg = app.Utils.localize('err_status');
			let msg = `${statusMsg}: ${status}`;
			msg += `\n${response.statusText}`;
			return Promise.reject(new Error(msg));
		}).catch((err) => {
			if (err.message === 'Failed to fetch') {
				err.message = app.Utils.localize('err_network');
			}
			throw new Error(err.message);
		});
	}

	return {
		/**
		 * Perform GET request to server using exponential back-off and
		 * optionally with authorization
		 * @param {string} url - server
		 * @param {boolean} [isAuth=false] - true if authorization required
		 * @param {boolean} [retryAuth=false] - if true, retry with new token
		 * @param {boolean} [backoff=true] - if true, do exponential back-off
		 * @returns {Promise.<json>} response from server
		 * @memberOf app.Http
		 */
		doGet: function(url, isAuth = false, retryAuth = false,
						backoff = true) {
			let attempt = 0;
			let options = {method: 'GET', headers: new Headers({})};

			return _fetch(url, options, isAuth, retryAuth, attempt, backoff);
		},
	};
})();
