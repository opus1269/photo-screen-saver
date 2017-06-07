/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Wrapper for chrome messages
 * @namespace
 */
app.Msg = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Show a {@link app.Screensaver}
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const SS_SHOW = {
    message: 'showScreensaver',
  };

  /**
   * Close a {@link app.Screensaver}
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const SS_CLOSE = {
    message: 'closeScreensaver',
  };

  /**
   * Is a {@link app.Screensaver} showing
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const SS_IS_SHOWING = {
    message: 'isScreensaverShowing',
  };

  /**
   * Restore default settings
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const RESTORE_DEFAULTS = {
    message: 'restoreDefaults',
  };

  /**
   * Highlight a tab
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const HIGHLIGHT = {
    message: 'highlightTab',
  };

  /**
   * An {@link app.PhotoSource} server request failed
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const PHOTO_SOURCE_FAILED = {
    message: 'photoSourceFailed',
    key: '',
    error: '',
  };

  /**
   * Save value to storage message
   * @type {Chrome.Msg.Message}
   * @memberOf app.Msg
   */
  const STORE = {
    message: 'store',
    key: '',
    value: '',
  };

  return {
    SS_SHOW: SS_SHOW,
    SS_CLOSE: SS_CLOSE,
    SS_IS_SHOWING: SS_IS_SHOWING,
    RESTORE_DEFAULTS: RESTORE_DEFAULTS,
    HIGHLIGHT: HIGHLIGHT,
    PHOTO_SOURCE_FAILED: PHOTO_SOURCE_FAILED,
    STORE: STORE,
  };
})();
