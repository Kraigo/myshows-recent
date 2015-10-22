var app = {
	baseUrl: 'http://api.myshows.ru/',
	resources: {
		fsto: 'http://fs.to/video/serials/search.aspx?search=',
		exua: 'http://www.ex.ua/search?s=',
		rutrackerorg: 'http://rutracker.org/forum/search_cse.php?cx=014434608714260776013%3Aggcq1kovlga&cof=FORID%3A9&ie=utf-8&sa=%D0%9F%D0%BE%D0%B8%D1%81%D0%BA+%D0%B2+Google&q=',
		rutororg: 'http://rutor.org/search/0/4/000/0/',
		nnmclubme: 'http://nnm-club.me/?w=title&q=',
		kickassto: 'https://kat.cr/usearch/',
		hdrezkame: 'http://hdrezka.me/index.php?do=search&subaction=search&q=',
		seasonvarru: 'http://seasonvar.ru/search?x=0&y=0&q=',
		kinozaltv: 'http://kinozal.tv/browse.php?s='
	},
	options: null,

	get: function(method, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open( "GET", this.baseUrl + method, true );
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (!xhr.status) return;

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
		return localStorage[key] ? JSON.parse(localStorage[key]) : false;
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
		app.getOptions(function(options) {
			if (!options.notification) return;
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

		})
	},
	getAllowedResources: function(resources) {
		var result = [];
		for (var i in resources) {
			var res = resources[i];
			result.push({title: res, link: this.resources[res]});
		}
		return result;
	},
	getEpisodeDate: function(date) {
		var res = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
		return Date.parse(res[3]+'-'+res[2]+'-'+res[1]);
	}

};