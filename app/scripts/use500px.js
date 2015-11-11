/*
@@license
*/
/*exported use500px*/
var use500px = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var SDK_KEY = 'f6c33b154c30f00eaf6ca8b68a0fd89674f35d56';
	var MAX_PHOTOS = 100; // 100 is api max
	var TYPE_ENUM = Object.freeze({'popular': 1, 'fresh_yesterday': 2});
	// categroies to use - we make them an array to overcome 100 photo limit per call
	var CATS = ['Animals,City and Architecture', 'Landscapes,Still Life', 'Macro,Underwater'];

	// callback function(error, httpStatus, responseText)
	function authenticatedXhr(method, url, callback) {
		var retry = true;
		(function getTokenAndXhr() {
			chrome.identity.getAuthToken({'interactive': true},
											function(accessToken) {
				if (chrome.runtime.lastError) {
					callback(chrome.runtime.lastError);
					return;
				}

				var xhr = new XMLHttpRequest();
				xhr.open(method, url);
				xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
				xhr.send();
				xhr.onload = function() {
					if (this.status === 401 && retry) {
						// This status may indicate that the cached
						// access token was invalid. Retry once with
						// a fresh token.
						retry = false;
						chrome.identity.removeCachedAuthToken(
								{'token': accessToken},
								getTokenAndXhr);
						return;
					}

					callback(null, this.status, this.responseText);
				};
				xhr.onerror = function(e) {
					callback(e);
				};
			});

		})();
	}

	return {

		TYPE_ENUM: TYPE_ENUM,

		loadImages: function(type, name, preload) {

			try {
				_500px.init({sdk_key: SDK_KEY});
			} catch (e) {}

			for (var j = 0; j < CATS.length; j++) {
				try {
					_500px.api('/photos',{feature: type, only: CATS[j], rpp: MAX_PHOTOS, sort: 'rating', image_size: 2048}, function(response) {
						var imgs = [], img;
						var images = [], image;
						var aspectRatio;
						for (var i = 0; i < response.data.photos.length; i++) {
							var photo = response.data.photos[i];
							if (!photo.nsfw) {
								if (preload) {
									img = new Image();

									// cut out bad images
									img.onerror = function() {
										/*jshint validthis: true */
										var ims = JSON.parse(localStorage.getItem(name));
										var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
										if (ind >= 0) {
											ims.splice(ind, 1);
											localStorage.setItem(name, JSON.stringify(ims));
										}
									};
									img.src = photo.images[0].url;
									imgs.push(img);
								}

								aspectRatio = photo.width / photo.height;
								image = {};
								image.url = photo.images[0].url;
								image.author = photo.user.fullname;
								image.asp = aspectRatio.toPrecision(3);
								images.push(image);
							}
						}
						var tmp = [];
						if (localStorage.getItem(name)) {
							tmp = JSON.parse(localStorage.getItem(name));
							tmp = tmp.concat(images);
							myUtils.shuffleArray(tmp);
						} else {
							tmp = images;
						}
						localStorage.setItem(name, JSON.stringify(tmp));
					});
				} catch (e) {console.log(e);}
			}
		},

		// callback function(albumList, error)
		loadAlbumList: function(callback) {
			//var request = 'https://api.500px.com/v1/photos?feature=popular';

			// chrome.runtime.getBackgroundPage().oauth500px.authorize(function() {
			// 	console.log('authorized');
			// });
			//
			// callback(null,true);

			// 			authenticatedXhr('GET',request, function(error, httpStatus, responseText) {
			// 	console.log(responseText);
			// 	if (error) {
			// 		callback(null, error);
			// 		return;
			// 	} else if (httpStatus !== 200) {
			// 		callback(null, 'Server status: ' + httpStatus);
			// 		return;
			// 	}
			// });
			var path = 'https://api.500px.com/v1/oauth?oauth_consumer_key=f6c33b154c30f00eaf6ca8b68a0fd89674f35d56';
			chrome.identity.launchWebAuthFlow({'url': path, 'interactive': true}, function(redirect_url) {
					console.log(redirect_url);
				});

			// try {
			// 	_500px.init({sdk_key: SDK_KEY});
			// } catch (e) {}
			//
			// _500px.login(function(status) {
			// 	if (status === 'authorized') {
			// 		console.log('You have logged in');
			// 		_500px.api('/users', function(response) {
			// 			console.log(response);
			// 		});
			// 	} else {
			// 		console.log('You denied my application');
			// 		callback();
			// 	}
			// });
			// _500px.ensureAuthorization(function() {
			// 	_500px.api('/users', function(response) {
			// 		console.log('Your username is ' + response.user.username);
			// 		console.log(response);
			//
			// 		callback();
			// 	});
			// });
		}

	};
})();
