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
	 * Authorization header
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _AUTH_HEADER = 'Authorization';

	/**
	 * Bearer parameter for authorized call
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _BEARER = 'Bearer';

	/**
	 * Max retries on 500 errors
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _MAX_RETRIES = 3;

	/**
	 * Delay multiplier for exponential back-off
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Http
	 */
	const _DELAY = 1000;

	/**
	 * Check response and act accordingly
	 * @param {{}} response - response from server
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {boolean} isAuth - true is authorization required
	 * @param {boolean} retryToken - if true, retry with new token
	 * @param {string} token - cached auth token
	 * @param {boolean} interactive - true if user initiated
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} backoff - if true, do exponential back-off
	 * @param {int} maxRetries - max retries
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _processResponse(response, url, opts, isAuth, retryToken, token,
							interactive, attempt, backoff, maxRetries) {
		if (response.ok) {
			// request succeeded - woo hoo!
			return response.json();
		}

		if (attempt >= maxRetries) {
			// request still failed after maxRetries
			return Promise.reject(_getError(response));
		}

		const status = response.status;

		if (backoff && (status >= 500) && (status < 600)) {
			// temporary server error, maybe. Retry with backoff
			return _retry(url, opts, isAuth, retryToken, interactive, attempt,
						maxRetries);
		}

		if (isAuth && token && retryToken && (status === 401)) {
			// could be expired token. Remove cached one and try again
			return _retryToken(url, opts, token, interactive, attempt,
				backoff, maxRetries);
		}

		if (isAuth && interactive && token && retryToken && (status === 403)) {
			// user may have revoked access to extension at some point
			// If interactive, retry so they can authorize again
			return _retryToken(url, opts, token, interactive, attempt,
				backoff, maxRetries);
		}

		// request failed
		return Promise.reject(_getError(response));
	}

	/**
	 * Get Error message
	 * @param {{}} response - server response
	 * @returns {Error} details on failure
	 * @private
	 * @memberOf app.Http
	 */
	function _getError(response) {
		let msg = 'Unknown error.';
		if (response && response.status &&
			(response.statusText !== undefined)) {
			const statusMsg = app.Utils.localize('err_status');
			msg = `${statusMsg}: ${response.status}`;
			msg += `\n${response.statusText}`;
		}
		return new Error(msg);
	}

	/**
	 * Get authorization token
	 * @param {boolean} isAuth - if true, authorization required
	 * @param {boolean} interactive - if true, user initiated
	 * @returns {Promise.<string>} auth token
	 * @private
	 * @memberOf app.Http
	 */
	function _getAuthToken(isAuth, interactive) {
		if (isAuth) {
			return chromep.identity.getAuthToken({
				'interactive': interactive,
			}).then((token) => {
				return Promise.resolve(token);
			}).catch((err) => {
				if (interactive && (err.message.includes('revoked') ||
					err.message
						.includes('Authorization page could not be loaded'))) {
					// try one more time non-interactively
					// Always returns Authorization page error
					// when first registering, Not sure why
					// Other message is if user revoked access to extension
					return chromep.identity.getAuthToken({
						'interactive': false,
					});
				} else {
					throw err;
				}
			});
		} else {
			// non-authorization branch
			return Promise.resolve(null);
		}
	}

	/**
	 * Retry authorized fetch with exponential back-off
	 * @param {string} url - server request
	 * @param {Object} opts - fetch options
	 * @param {boolean} isAuth - if true, authorization required
	 * @param {boolean} retryToken - if true, retry with new token
	 * @param {boolean} interactive - true if user initiated
	 * @param {int} attempt - the retry attempt we are on
	 * @param {int} maxRetries - max retries
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retry(url, opts, isAuth, retryToken, interactive, attempt,
					maxRetries) {
		attempt++;
		// eslint-disable-next-line promise/avoid-new
		return new Promise((resolve, reject) => {
			const delay = (Math.pow(2, attempt) - 1) * _DELAY;
			setTimeout(() => {
				return _fetch(url, opts, isAuth, retryToken, interactive,
					attempt, true, maxRetries).then(resolve, reject);
			}, delay);
		});
	}

	/**
	 * Retry fetch after removing cached auth token
	 * @param {string} url - server request
	 * @param {Object} opts - fetch options
	 * @param {string} token - cached auth token
	 * @param {boolean} interactive - true if user initiated
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} backoff - if true, do exponential back-off
	 * @param {int} maxRetries - max retries
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retryToken(url, opts, token, interactive, attempt, backoff,
						maxRetries) {
		app.GA.error('Refresh auth token.', 'app.Http._retryToken');
		return chromep.identity.removeCachedAuthToken({
			token: token,
		}).then(() => {
			return _fetch(url, opts, true, false, interactive, attempt,
				backoff, maxRetries);
		});
	}

	/**
	 * Perform fetch, optionally using authorization and exponential back-off
	 * @param {string} url - server request
	 * @param {Object} opts - fetch options
	 * @param {boolean} isAuth - if true, authorization required
	 * @param {boolean} retryToken - if true, retry with new token
	 * @param {boolean} interactive - if true, user initiated
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} backoff - if true, do exponential back-off
	 * @param {int} maxRetries - max retries on 500 failures
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _fetch(url, opts, isAuth, retryToken, interactive, attempt,
					backoff, maxRetries) {
		let token = '';
		return _getAuthToken(isAuth, interactive).then((authToken) => {
			if (isAuth) {
				token = authToken;
				opts.headers.set(_AUTH_HEADER, `${_BEARER} ${token}`);
			}
			return fetch(url, opts);
		}).then((response) => {
			return _processResponse(response, url, opts, true, retryToken,
				token, interactive, attempt, backoff, maxRetries);
		}).catch((err) => {
			let msg = err.message;
			if (msg === 'Failed to fetch') {
				msg = app.Utils.localize('err_network');
			}
			throw new Error(msg);
		});
	}

	return {
		/**
		 * Perform GET request to server, optionally using exponential back-off
		 * and authorization
		 * @param {string} url - server request
		 * @param {boolean} [isAuth=false] - if true, authorization required
		 * @param {boolean} [retryToken=false] - if true, retry with new token
		 * @param {boolean} [interactive=false] - user initiated, if true
		 * @param {boolean} [backoff=true] - if true, do exponential back-off
		 * @param {int} [maxRetries=_MAX_ATTEMPTS] - max retries
		 * @returns {Promise.<json>} response from server
		 * @memberOf app.Http
		 */
		doGet: function(url, isAuth = false, retryToken = false,
				interactive = false, backoff = true,
				maxRetries = _MAX_RETRIES) {
			let attempt = 0;
			const opts = {method: 'GET', headers: new Headers({})};
			if (isAuth) {
				opts.headers.set(_AUTH_HEADER, `${_BEARER} unknown`);
			}
			return _fetch(url, opts, isAuth, retryToken, interactive,
				attempt, backoff, maxRetries);
		},
	};
})();
