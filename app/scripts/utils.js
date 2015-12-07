/*
@@license
*/
/*exported myUtils*/
var myUtils = (function() {
	'use strict';

	// minutes in day
	var MIN_IN_DAY = 60 * 24;

	// milli-seconds in day
	var MSEC_IN_DAY = MIN_IN_DAY * 60 * 1000;

	return {

		MIN_IN_DAY: MIN_IN_DAY,

		MSEC_IN_DAY: MSEC_IN_DAY,

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
		},

		// get time
		// value format: '00:00'
		getTime: function(value) {
			var date = new Date();

			date.setHours(value.substr(0,2));
			date.setMinutes(value.substr(3,2));
			return date.getTime();
		},

		// calculate delta in time from now in minutes on a 24 hr basis
		// value format: '00:00'
		getTimeDelta: function(value) {
			var curTime = Date.now();
			var time = this.getTime(value);
			var delayMin = (time - curTime) / 1000 / 60;

			if (delayMin < 0) {
				delayMin = MIN_IN_DAY + delayMin;
			}
			return delayMin;
		},

		// is the current time between start and stop
		isInRange: function(start, stop) {
			var curTime = Date.now();
			var startTime = this.getTime(start);
			var stopTime = this.getTime(stop);
			var ret = false;

			if (start === stop) {
				return true;
			}

			if (stopTime > startTime) {
				if ((curTime >= startTime) && (curTime < stopTime)) {
					ret = true;
				}
			} else {
				if ((curTime >= startTime) || (curTime < stopTime)) {
					ret = true;
				}
			}
			return ret;
		}
	};
})();
