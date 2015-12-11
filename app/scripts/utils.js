/*
@@license
*/
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

		// get the current Chrome version
		// http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
		getChromeVersion: function() {
			var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		// get a global unique identifier
		// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
		getGuid: function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
			}
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
		},

		// add an image to an array
		addImage: function(images, url, author, asp, ex) {
			var image = {url: url, author: author, asp: asp.toPrecision(3)};
			if (ex) {
				image.ex = ex;
			}
			images.push(image);
		}

	};
})();
