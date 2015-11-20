/*
@@license
*/
/*exported gPhotos*/
var gPhotos = (function() {
	'use strict';

	var PICASA_PATH = 'https://picasaweb.google.com/data/feed/api/user/';
	var PHOTOS_QUERY = '?imgmax=1600&thumbsize=72&fields=entry(media:group/media:content,media:group/media:credit)&v=2&alt=json';

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

	// callback function(photos, error);
	function loadPicasaAlbum(id, callback) {
		var request = PICASA_PATH + 'default/albumid/' + id + '/' + PHOTOS_QUERY;

		authenticatedXhr('GET',request, function(error, httpStatus, responseText) {
			if (error) {
				callback(null, error);
				return;
			} else if (httpStatus !== 200) {
				callback(null, 'Server status: ' + httpStatus);
				return;
			}

			var root = JSON.parse(responseText);
			var feed = root.feed;
			var entries = feed.entry || [], entry;
			var images = [];
			var url,author,width,height,asp;

			for (var i = 0; i < entries.length; i++) {
				entry = entries[i];
				if (isImage(entry)) {
					url = entry.media$group.media$content[0].url;
					width = entry.media$group.media$content[0].width;
					height = entry.media$group.media$content[0].height;
					asp = width / height;
					author = entry.media$group.media$credit[0].$t;
					myUtils.addImage(images, url, author, asp);
				}
			}
			callback(images, error);
		});
	}

	return {

		loadAuthorImages: function() {
			var authorID = '103839696200462383083';
			var authorAlbum = '6117481612859013089';
			var request = PICASA_PATH + authorID + '/albumid/' + authorAlbum + '/' + PHOTOS_QUERY;
			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				var root = JSON.parse(xhr.response);
				var feed = root.feed;
				var entries = feed.entry || [], entry;
				var images = [];
				var url, author, width, height, asp;

				for (var i = 0; i < entries.length; i++) {
					entry = entries[i];
					url = entry.media$group.media$content[0].url;
					width = entry.media$group.media$content[0].width;
					height = entry.media$group.media$content[0].height;
					asp = width / height;
					author = entry.media$group.media$credit[0].$t;
					myUtils.addImage(images, url, author, asp);
				}
				localStorage.authorImages = JSON.stringify(images);
			};

			xhr.open('GET', request, true);
			xhr.send();
		},

		// callback function(albumList, error)
		loadAlbumList: function(callback) {
			var albumListQuery = '?v=2&thumbsize=72&alt=json';
			var request = PICASA_PATH + 'default/' + albumListQuery;

			authenticatedXhr('GET',request, function(error, httpStatus, responseText) {
				if (error) {
					callback(null, error);
					return;
				} else if (httpStatus !== 200) {
					callback(null, 'Server status: ' + httpStatus);
					return;
				}

				var root = JSON.parse(responseText);
				var feed = root.feed;
				var entries = feed.entry || [], entry;
				var albumList = [], album;
				var ct = 0;

				for (var i = 0; i < entries.length; ++i) {
					(function(index) {
						entry = entries[index];
						loadPicasaAlbum(entries[index].gphoto$id.$t, function(photos, error) {
							if (error) {
								callback(null, error);
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
								callback(albumList, error);
							}
							ct++;
						});
					})(i);
				}
			});
		}
	};
})();
