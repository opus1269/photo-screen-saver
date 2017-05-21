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
	 * Get auth token
	 * @param {boolean} interactive - true if user initiated
	 * @returns {Promise.<string>} auth token
	 * @private
	 * @memberOf app.Http
	 */
	function _getAuthToken(interactive) {
		return chromep.identity.getAuthToken({
			'interactive': interactive,
		}).then((token) => {
			return Promise.resolve(token);
		}).catch((err) => {
			if (interactive &&
				(err.message.includes(
					'Authorization page could not be loaded') ||
				err.message.includes(
					'revoked'))) {
				// try one more time non-interactively
				// Always returns Authorization page one
				// when first registering. Not sure why
				// Other message is if user revoked access
				return chromep.identity.getAuthToken({
					'interactive': false,
				});
			} else {
				throw err;
			}
		});
	}

	/**
	 * Retry fetch with exponential back-off
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {int} attempt - the retry attempt we are on
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retry(url, opts, attempt) {
		attempt++;
		// eslint-disable-next-line promise/avoid-new
		return new Promise((resolve, reject) => {
			const delay = (Math.pow(2, attempt) - 1) * _DELAY;
			setTimeout(() => {
				return _fetch(url, opts, attempt).then(resolve, reject);
			}, delay);
		});
	}

	/**
	 * Retry authorized fetch with exponential back-off
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {boolean} retry - if true, retry with new token
	 * @param {boolean} interactive - true if user initiated
	 * @param {int} attempt - the retry attempt we are on
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retryWithAuth(url, opts, retry, interactive, attempt) {
		attempt++;
		// eslint-disable-next-line promise/avoid-new
		return new Promise((resolve, reject) => {
			const delay = (Math.pow(2, attempt) - 1) * _DELAY;
			setTimeout(() => {
				return _fetchWithAuth(url, opts, retry, interactive, attempt)
					.then(resolve, reject);
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
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _retryToken(url, opts, token, interactive, attempt, backoff) {
		app.GA.error('Refresh auth token.', 'app.Http._retryToken');
		return chromep.identity.removeCachedAuthToken({
			token: token,
		}).then(() => {
			return _fetchWithAuth(url, opts, false, interactive, attempt,
				backoff);
		});
	}

	/**
	 * Perform fetch using exponential back-off
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} [backoff=true] - if true, do exponential back-off
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _fetch(url, opts, attempt, backoff = true) {
		return fetch(url, opts).then((response) => {
			const status = response.status;

			if (response.ok) {
				// request succeeded
				return response.json();
			}

			if (attempt >= _MAX_ATTEMPTS) {
				// request failed after max retries
				return Promise.reject(_getError(response));
			}

			if (backoff && (status >= 500) && (status < 600)) {
				// temporary network error, maybe. Retry
				return _retry(url, opts, attempt);
			}

			// request failed
			return Promise.reject(_getError(response));
		}).catch((err) => {
			let msg = err.message;
			if (msg === 'Failed to fetch') {
				msg = app.Utils.localize('err_network');
			}
			throw new Error(msg);
		});
	}

	/**
	 * Perform fetch using authorization and exponential back-off
	 * @param {string} url - server
	 * @param {Object} opts - fetch options
	 * @param {boolean} retry - if true, retry with new token
	 * @param {boolean} interactive - user initiated, if true
	 * @param {int} attempt - the retry attempt we are on
	 * @param {boolean} [backoff=true] - if true, do exponential back-off
	 * @returns {Promise.<JSON>} response from server
	 * @private
	 * @memberOf app.Http
	 */
	function _fetchWithAuth(url, opts, retry, interactive, attempt, backoff) {
		let token = '';
		return _getAuthToken(interactive).then((authToken) => {
			const AUTH_HEADER = 'Authorization';
			token = authToken;
			if (opts.headers.has(AUTH_HEADER)) {
				opts.headers.set(AUTH_HEADER, `Bearer ${token}`);
			} else {
				opts.headers.append(AUTH_HEADER, `Bearer ${token}`);
			}
			return fetch(url, opts);
		}).then((response) => {
			const status = response.status;

			if (response.ok) {
				// request succeeded
				return response.json();
			}

			if (attempt >= _MAX_ATTEMPTS) {
				// request failed after max retries
				return Promise.reject(_getError(response));
			}

			if (backoff && (status >= 500) && (status < 600)) {
				// temporary network error, maybe. Retry
				return _retryWithAuth(url, opts, retry, interactive, attempt);
			}

			if (token && retry && (status === 401)) {
				// could be bad token. Remove cached one and try again
				return _retryToken(url, opts, token, interactive, attempt,
					backoff);
			}

			if (interactive && token && retry && (status === 403)) {
				// user may have disallowed extension. Retry if interactive
				return _retryToken(url, opts, token, interactive, attempt,
					backoff);
			}

			// request failed
			return Promise.reject(_getError(response));
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
		 * Perform GET request to server using exponential back-off
		 * @param {string} url - server request
		 * @param {boolean} [backoff=true] - if true, do exponential back-off
		 * @returns {Promise.<json>} response from server
		 * @memberOf app.Http
		 */
		doGet: function(url, backoff = true) {
			let attempt = 0;
			let options = {method: 'GET'};
			return _fetch(url, options, attempt, backoff);
		},

		/**
		 * Perform GET request to server using exponential back-off and
		 * authorization
		 * @param {string} url - server
		 * @param {boolean} [retry=false] - if true, retry with new token
		 * @param {boolean} [interactive=false] - user initiated, if true
		 * @param {boolean} [backoff=true] - if true, do exponential back-off
		 * @returns {Promise.<json>} response from server
		 * @memberOf app.Http
		 */
		doGetWithAuth: function(url, retry = false, interactive = false,
								backoff = true) {
			let attempt = 0;
			let options = {method: 'GET', headers: new Headers({})};

			return _fetchWithAuth(url, options, retry, interactive, attempt,
				backoff);
		},
	};
})();
