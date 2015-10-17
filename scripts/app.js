var app = {
	baseUrl: 'http://api.myshows.ru/',
	get: function(method, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open( "GET", this.baseUrl + method, true );
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 401 && app.isAuthorized()) {
					app.login();
					app.get(method, callback);
				} else if (xhr.status == 403) {
					app.logout();
				}
				var success = (xhr.responseText[0] == '{') ? JSON.parse(xhr.responseText) : null;
				callback ? callback(success, xhr.status) : '';
			}
		}
		xhr.send( null );
	},
	login: function(login, password, callback) {
		if (!login && !password) {
			var auth = this.localGet('auth');
			login = auth.login;
			password = auth.password;
		}
		this.get('profile/login?login=' + login + '&password=' + password, callback);
	},
	logout: function() {
		localStorage.clear();
	},
	profile: function() {
		this.get('profile');
	},
	shows: function(callback) {
		this.get('profile/shows/', callback);
	},
	unwatched: function(callback) {
		this.get('profile/episodes/unwatched/', callback);
	},
	watched: function(callback) {
		this.get('profile/episodes/next/', callback);
	},
	checkEpisode: function(episodeId, callback) {
		this.get('profile/episodes/check/' + episodeId, callback);
	},
	isAuthorized: function() {
		return localStorage['auth'] != undefined;
	},
	localSave: function(key, data) {
		localStorage[key] = JSON.stringify(data);
	},
	localGet: function(key) {
		return localStorage[key] ? JSON.parse(localStorage[key]) : [];
	},
	numFormat: function(num) {
		return (num.toString().length == 1) ? '0' + num : num;
	},
	updateBadge:function(num) {
		num = num.toString();
		this.getOptions(function(options) {
			if (options.badge)
				chrome.browserAction.setBadgeText({text: num})
			else {
				chrome.browserAction.setBadgeText({text: ''})
			}
		});
		
	},
	getOptions: function(callback) {
		chrome.storage.sync.get({
			notification: true,
			badge: true,
			resources: ['fs.to']
		}, callback);
	},
	getUnwatchedShows: function(shows, unwatched) {
		shows = shows || app.localGet('shows');
		unwatched = unwatched || app.localGet('unwatched');
		var result = [];

		for(var i in unwatched) {
			var episode = unwatched[i];
			if (!shows[episode.showId].unwatchedEpisodesData) {
				shows[episode.showId].unwatchedEpisodesData = [];
			}
			shows[episode.showId].unwatchedEpisodesData.unshift(episode);				
		}

		for (var i in shows) {
			var show = shows[i];
			if (show.unwatchedEpisodesData && show.unwatchedEpisodesData.length > 0) {
				result.push(show);
			}
		}
		return result;
	},
	notification: function(type, title, body, image) {

		var options = {
			type: type,
			title: title,
			iconUrl: 'images/icon-128.png'			
		};

		if (type == 'list') {
			options.message = '';
			options.items = body;
		} else if (type == 'image') {
			options.message = body;
			options.imageUrl = image
		}
		
		chrome.notifications.create(null, options, function () {});
	}

};