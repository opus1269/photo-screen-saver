var gPhotos = (function() {
"use strict";

var picasaPath = 'https://picasaweb.google.com/data/feed/api/user/';
var photosQuery = '?imgmax=720&thumbsize=72&fields=entry(media:group/media:content,media:group/media:credit)&v=2&alt=json';

var drivePath = 'https://www.googleapis.com/drive/v2/files/';

// callback = function (error, httpStatus, responseText);
function authenticatedXhr(method, url, callback) {
	var retry = true;
	(function getTokenAndXhr() {
		chrome.identity.getAuthToken({ 'interactive': true },
																 function (access_token) {
			if (chrome.runtime.lastError) {
				callback(chrome.runtime.lastError);
				return;
			}

			var xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.setRequestHeader('Authorization',
													 'Bearer ' + access_token);
			xhr.send();
			xhr.onload = function () {
				if (this.status === 401 && retry) {
					// This status may indicate that the cached
					// access token was invalid. Retry once with
					// a fresh token.
					retry = false;
					chrome.identity.removeCachedAuthToken(
							{ 'token': access_token },
							getTokenAndXhr);
					return;
				}

				callback(null, this.status, this.responseText);
			};
			xhr.onerror = function (e) {
				callback(e);
			};
		});

	})();
}

// determine if a Picasa entry is an image
function isImage(entry) {
	var content = entry.media$group.media$content;
	for(var i=0; i< content.length ; i++) {
		if(content[i].medium !== 'image') {
			return false;
		}
	}
	return true;
}

// callback = function (photos, error);
function loadPicasaAlbum(id, preload, callback) {
	var request = picasaPath + 'default/albumid/' + id + '/' + photosQuery;

	authenticatedXhr('GET',request, function (error, httpStatus, responseText) {
		if (error) {
			callback(null, error);
			return;
		}
		else if (httpStatus !== 200) {
			callback(null, 'Server status: ' + httpStatus);
			return;
		}

		var root = JSON.parse(responseText);
		var feed = root.feed;
		var entries = feed.entry || [], entry;
		var imgs = [], img;
		var photos = [],photo;
		var url,author,width,height,aspectRatio;

		for (var i = 0; i < entries.length; i++) {
			entry = entries[i];
			if(isImage(entry)) {
				url = entry.media$group.media$content[0].url;
				width = entry.media$group.media$content[0].width;
				height = entry.media$group.media$content[0].height;
				aspectRatio = width / height;
				author = entry.media$group.media$credit[0].$t;

				if(preload) {
					img = new Image();
			 // img.addEventListener('error', _imgError);
					img.src = url;
					imgs.push(img);
				}

				photo = {};
				photo.url = url;
				photo.author = author;
				photo.asp = aspectRatio.toPrecision(3);
				photos.push(photo);
			}
		}
		callback(photos, error);
	});
}

// determine is a drive item is a valid photo by google photos standards
function isValidPhoto(item) {
	if(!item.imageMediaMetadata ||
			item.imageMediaMetadata.width < 512 ||
			item.imageMediaMetadata.height < 512 ) {
			return false;
	}
	return true;
}

function getAlbumByID(arr, value) {
	for (var i=0, iLen=arr.length; i<iLen; i++) {
		if (arr[i].id === value) return arr[i];
	}
}

// callback = function (albumList, error);
function loadDriveAlbumList(albumList,callback) {
	var request;
	var recurs;
	var albumListQuery = "?q=(trashed = false and (mimeType contains 'image/' and mimeType != 'image/png'))&maxResults=1000&alt=json";

	albumListQuery = albumListQuery + "&fields=nextPageToken,nextLink,items(parents,thumbnailLink,imageMediaMetadata)";
	request = drivePath + albumListQuery;

	authenticatedXhr('GET',request, recurs = function (error, httpStatus, responseText) {
		if (error) {
			callback(null, error);
			return;
		}

		var root = JSON.parse(responseText);
		var items = root.items || [], item;
		var album;
		var id;
		var ct=0;
		var val;

		for (var i = 0; i < items.length; ++i) {
			item = items[i];
			id = item.parents[0].id;
			if(isValidPhoto(item)) {
				ct++;
				val = getAlbumByID(albumList,id);
				if(!val) {
						album = {};
						album.index = -1;
						album.type = 'drive';
						album.name = 'unknown';
						album.id = id;
						album.ct = 1;
						album.thumb = item.thumbnailLink;
						album.checked = false;
		 // album.photos = photos;
						albumList.push(album);
				}
				else {
					val.ct = val.ct + 1;
				}
			}
		}
		if(root.nextPageToken) {
			authenticatedXhr('GET', root.nextLink, recurs);
		}
		else {
			callback(albumList, error);
		}
	});
}

// callback = function (error);
function setDriveAlbumNames(albumList,callback) {
	var request;

	for(var i=0; i<albumList.length; i++) {
		(function (index) {
			if(albumList[index].type === 'drive') {
				request = drivePath + albumList[index].id + '/' + "?alt=json&fields=title";
				authenticatedXhr('GET',request, function (error, httpStatus, responseText) {
					if(error) {
						callback(error);
						return;
					}

					var root = JSON.parse(responseText);
					albumList[index].name = root.title;
					if(index === (albumList.length - 1)) {
						callback(error);
						return;
					}
				});
			}
		})(i);
	}
}

// callback = function (photos, error);
function loadDriveAlbum(id, preload, callback) {
	var request;
	var recurs;
	var photos = [],photo;

	request = drivePath + "?q=" + "'" + id + "'" + " in parents";

	authenticatedXhr('GET',request, recurs = function (error, httpStatus, responseText) {
		if (error) {
			callback(null, error);
			return;
		}

		var root = JSON.parse(responseText);
		var items = root.items || [], item;
		var imgs = [], img;
		var url,author,width,height,aspectRatio;

		for (var i = 0; i < items.length; i++) {
			item = items[i];
			if(isValidPhoto(item)) {
				url =	 'https://drive.google.com/uc?id=' + item.id;
				width = item.imageMediaMetadata.width;
				height = item.imageMediaMetadata.height;
				aspectRatio = width / height;
				author = item.ownerNames[0];

				if(preload) {
					img = new Image();
			 // img.addEventListener('error', _imgError);
					img.src = url;
					imgs.push(img);
				}

				photo = {};
				photo.url = url;
				photo.author = author;
				photo.asp = aspectRatio.toPrecision(3);
				photos.push(photo);
			}
		}
		if(root.nextPageToken) {
			authenticatedXhr('GET', root.nextLink, recurs);
		}
		else {
			callback(photos, error);
		}
	});
}

return {

	preloadAuthorImages: function () {
		var authorID = '103839696200462383083';
		var authorAlbum = '6117481612859013089';
		var request = picasaPath + authorID + '/albumid/' + authorAlbum + '/' + photosQuery;
		var oReq = new XMLHttpRequest();
		
		oReq.onload = function (e) {
			var root = JSON.parse(oReq.response);
			var feed = root.feed;
			var entries = feed.entry || [], entry;
			var imgs = [], img;
			var authorImages = [],authorImage;
			var url,author,width,height,aspectRatio;

			for (var i = 0; i < entries.length; i++) {
				entry = entries[i];
				url = entry.media$group.media$content[0].url;
				width = entry.media$group.media$content[0].width;
				height = entry.media$group.media$content[0].height;
				aspectRatio = width / height;
				author = entry.media$group.media$credit[0].$t;
				img = new Image();
				//img.addEventListener('error', imgError);
				img.src = url;
				imgs.push(img);
				authorImage = {};
				authorImage.url = url;
				authorImage.author = author;
				authorImage.asp = aspectRatio.toPrecision(3);
				authorImages.push(authorImage);
			}
			localStorage.authorImages = JSON.stringify(authorImages);
		};
		
		oReq.open("GET", request, true);
		oReq.send();
	},

	// callback = function (photos, error);
	loadAlbum: function (type, id, preload, callback) {

		if (type === 'picasa') {
			loadPicasaAlbum(id, preload, function (photos, error) {
				callback(photos, error);
			});
		}
		else {
			loadDriveAlbum(id, preload, function (photos, error) {
				callback(photos, error);
			});
		}
	},

	// callback = function (albumList, error);
	loadAlbumList: function (callback) {
		var albumListQuery = '?v=2&thumbsize=72&alt=json';
		var request = picasaPath + 'default/'	 + albumListQuery;

		authenticatedXhr('GET',request, function (error, httpStatus, responseText) {
			if (error) {
				callback(null, error);
				return;
			}
			else if (httpStatus !== 200) {
				callback(null, 'Server status: ' + httpStatus);
				return;
			}

			var root = JSON.parse(responseText);
			var feed = root.feed;
			var entries = feed.entry || [], entry;
			var albumList = [], album;
			var ct = 0;

			for (var i = 0; i < entries.length; ++i) {
				(function (index) {
					entry = entries[index];
					loadPicasaAlbum(entries[index].gphoto$id.$t, false, function (photos, error) {
						if(error) {
							callback(null, error);
							return;
						}
						if(!entries[index].gphoto$albumType && photos.length) {
							album = {};
							album.index = index;
							album.type = 'picasa';
							album.name = entries[index].title.$t;
							album.id = entries[index].gphoto$id.$t;
							album.ct = photos.length;
							album.thumb = entries[index].media$group.media$thumbnail[0].url;
							album.checked = false;
							album.photos = photos;
							albumList.push(album);
						}
						if(ct === (entries.length - 1)) {
							albumList.sort(function(a, b) {
								return a.index - b.index;
							});
							// TODO Need a more efficient way to handle drive photos
						 /* loadDriveAlbumList(albumList, function () {
								setDriveAlbumNames(albumList, function () {
									callback(albumList, error);
								});
							});*/
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