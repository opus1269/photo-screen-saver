/*
@@license
*/
/*exported gPhotos*/
var gPhotos = (function() {
	'use strict';

	var PICASA_PATH = 'https://picasaweb.google.com/data/feed/api/user/';
	var PHOTOS_QUERY = '?imgmax=1600&thumbsize=72&fields=entry(media:group/media:content,media:group/media:credit)&v=2&alt=json';
	var MAX_RETRY = 5;

	// perform a request using OAuth 2.0 authentication
	// callback function(error, httpStatus, responseText)
	function authenticatedXhr(method, url, callback) {
		var retryToken = 0;
		var retryError = 0;
		var error = null;
		(function getTokenAndXhr() {
			chrome.identity.getAuthToken({'interactive': true},
											function(accessToken) {
				if (chrome.runtime.lastError) {
					callback(chrome.runtime.lastError.message);
					return;
				}

				var xhr = new XMLHttpRequest();
				xhr.open(method, url);
				xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
				xhr.send();

				xhr.onload = function() {
					if (this.status === 401 && retryToken < MAX_RETRY) {
						// This status may indicate that the cached
						// access token was invalid. Retry a few times with
						// a fresh token.
						retryToken++;
						chrome.identity.removeCachedAuthToken({'token': accessToken}, getTokenAndXhr);
						return;
					}

					if (this.status !== 200 && retryError < MAX_RETRY) {
						// Some error, retry a few times
						retryError++;
						console.log('Http error: ' + this.status + ' try again : ' + retryError);
						getTokenAndXhr();
						return;
					}

					if (this.status !== 200) {
						error = '<strong>Server status: ' + this.status + '</strong><p>' + this.responseText + '</p>';
					}
					callback(error, this.status, this.responseText);
				};

				xhr.onerror = function() {
					var error = '<strong>Network Request: Unknown error</strong>';
					if (chrome.runtime.lastError) {
						error = chrome.runtime.lastError.message;
					}
					callback(error);
				};
			});

		})();
	}

	// determine if a Picasa entry is an image
	function isImage(entry) {
		var content = entry.media$group.media$content;
		for (var i = 0; i < content.length ; i++) {
			if (content[i].medium !== 'image') {
				return false;
			}
		}
		return true;
	}

	// return the array of photos
	function processPhotos(root) {
		var feed = root.feed;
		var entries = feed.entry || [], entry;
		var photos = [];
		var url,author,width,height,asp;

		for (var i = 0; i < entries.length; i++) {
			entry = entries[i];
			if (isImage(entry)) {
				url = entry.media$group.media$content[0].url;
				width = entry.media$group.media$content[0].width;
				height = entry.media$group.media$content[0].height;
				asp = width / height;
				author = entry.media$group.media$credit[0].$t;
				myUtils.addImage(photos, url, author, asp);
			}
		}
		return photos;
	}

	// load the photos for the given album
	// callback function(error, photos);
	function loadPicasaAlbum(id, callback) {
		var request = PICASA_PATH + 'default/albumid/' + id + '/' + PHOTOS_QUERY;

		authenticatedXhr('GET',request, function(error, httpStatus, responseText) {
			if (error) {
				callback(error);
				return;
			}
			callback(null, processPhotos(JSON.parse(responseText)));
		});
	}

	return {

		// load and store the developers photos default photo source
		loadAuthorImages: function() {
			var authorID = '103839696200462383083';
			var authorAlbum = '6117481612859013089';
			var request = PICASA_PATH + authorID + '/albumid/' + authorAlbum + '/' + PHOTOS_QUERY;
			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				localStorage.authorImages = JSON.stringify(processPhotos(JSON.parse(xhr.response)));
			};

			xhr.open('GET', request, true);
			xhr.send();
		},

		// load the users list of albums, including the photos in each
		// callback function(error, albumList)
		loadAlbumList: function(callback) {
			var albumListQuery = '?v=2&thumbsize=72&visibility=all&kind=album&alt=json';
			var request = PICASA_PATH + 'default/' + albumListQuery;

			authenticatedXhr('GET',request, function(error, httpStatus, responseText) {
				if (error) {
					callback(error);
					return;
				}

				var root = JSON.parse(responseText);
				var feed = root.feed;
				var entries = feed.entry || [];
				var albumList = [], album;
				var ct = 0;

				for (var i = 0; i < entries.length; ++i) {
					(function(index) {
						loadPicasaAlbum(entries[index].gphoto$id.$t, function(error, photos) {
							if (error) {
								callback(error);
								return;
							}

							if (!entries[index].gphoto$albumType && photos.length) {
								album = {};
								album.index = index;
								album.uid = 'album' + index;
								album.name = entries[index].title.$t;
								album.id = entries[index].gphoto$id.$t;
								album.ct = photos.length;
								album.thumb = entries[index].media$group.media$thumbnail[0].url;
								album.checked = false;
								album.photos = photos;
								albumList.push(album);
							}
							if (ct === (entries.length - 1)) {
								albumList.sort(function(a, b) {
									return a.index - b.index;
								});
								callback(null, albumList);
							}
							ct++;
						});
					})(i);
				}
			});
		},

		// update the photos in the selected albums
		updateImages: function() {
			var ct = 0;
			var items = JSON.parse(localStorage.albumSelections);
			var newItems = [];

			for (var i = 0; i < items.length; i++) {
				(function(index) {
					loadPicasaAlbum(items[index].id, function(error, photos) {
						if (error) {
							console.log(error);
						} else if (photos.length) {
							newItems.push({id: items[index].id, photos: photos});
						}

						if (ct === (items.length - 1)) {
							localStorage.albumSelections = JSON.stringify(newItems);
							return;
						}
						ct++;
					});
				})(i);
			}
		}

	};
})();
