/*exported myUtils*/
var myUtils = (function() {
	'use strict';

	return {

		// Fisher-Yates shuffle algorithm.
		shuffleArray: function(array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},

		// from:
		// http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
		getChromeVersion: function() {
			var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		}

	};
})();
