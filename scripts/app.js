var app = {
    baseUrl: 'http://api.myshows.ru/',
    options: null,

    get: function(method, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", this.baseUrl + method, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (!xhr.status) return;

                if (xhr.status == 401) {
                    app.isAuthorized(function(auth) {
                        if (auth) {
                            app.login(auth.login, auth.password);
                            app.get(method, callback);
                        }
                    })
                } else if (xhr.status == 403) {
                    app.logout();
                }

                var success = (xhr.responseText[0] == '{') ? JSON.parse(xhr.responseText) : null;
                callback ? callback(success, xhr.status) : '';
            }
        }
        xhr.send(null);
    },
    login: function(login, password, callback) {
        this.get('profile/login?login=' + login + '&password=' + password, callback);
    },
    logout: function() {
        localStorage.clear();
        app.updateBadge('');
        chrome.storage.sync.remove('auth');
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
    rateEpisode: function(episodeId, rate, callback) {
        this.get('profile/episodes/rate/' + rate + '/' + episodeId, callback)
    },
    isAuthorized: function(callback) {

        // Auth soft migration
        // ---
        if (app.localGet('auth')) {
            app.setOptions({ auth: app.localGet('auth') });
            localStorage.removeItem('auth');
            callback(true);
            return;
        }
        // ---

        chrome.storage.sync.get({ auth: false }, function(options) {
            callback(options.auth);
        });
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
    updateBadge: function(num) {
        num = num.toString();
        this.getOptions(function(options) {
            if (options.badge)
                chrome.browserAction.setBadgeText({ text: num });
            else {
                chrome.browserAction.setBadgeText({ text: '' });
            }
        });

    },
    getOptions: function(callback) {
        chrome.storage.sync.get({
            notification: true,
            badge: true,
            rate: false,
            pin: true,
            resources: ['fsto'],
            customResources: [],
            pinned: []
        }, function(options) {
            app.options = options;
            callback(options);
        });
    },
    setOptions: function(options, callback) {
        chrome.storage.sync.set(options, callback);
    },
    getUnwatchedShows: function(shows, unwatched) {
        shows = shows || app.localGet('shows');
        unwatched = unwatched || app.localGet('unwatched');
        var result = [];

        for (var i in unwatched) {
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

            chrome.notifications.create(null, options, function() {});

        })
    },
    getAllowedResources: function(allowedRes) {
        var result = [];
        var customResources = this.options.customResources;

        for (var i = 0; i < allowedRes.length; i++) {
            var res = allowedRes[i];

            for (var r = 0; r < $resources.length; r++) {
                if ($resources[r].id === res) {
                    result.push($resources[r]);
                    break;
                }
            }

            // Custom Resources
            for (var r = 0; r < customResources.length; r++) {
                if (customResources[r].id === res) {
                    result.push(customResources[r]);
                    break;
                }
            }
        }
        return result;
    },
    getEpisodeDate: function(date) {
        var res = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        return Date.parse(res[3] + '-' + res[2] + '-' + res[1]);
    },
    getPinned: function(showId) {
        return this.options.pin && this.options.pinned.indexOf(showId) >= 0;
    },

    fillPattern: function(pattern, data, parent) {
        parent = parent ? parent + '.' : '';
        for (var key in data) {
            var dataItem = data[key];
            if (Array.isArray(dataItem)) {
                var reg = new RegExp('{{' + parent + key + ':}}([\\s\\S]*){{:' + parent + key + '}}');
                var template = pattern.match(reg)[1];
                var loopResult = '';
                for (var item in dataItem) {
                    var loopData = dataItem[item];
                    loopResult += this.fillPattern(template, loopData, parent + key);
                }
                pattern = pattern.replace(reg, loopResult);
            } else {
                if (dataItem) {
                    var regIf = RegExp('{{' + parent + key + '!}}([\\s\\S]*){{!' + parent + key + '}}');
                    pattern = pattern.replace(regIf, '$1');
                }

                var reg = RegExp('{{' + parent + key + '}}', 'g');
                pattern = pattern.replace(reg, dataItem);
            }
        }
        pattern = pattern.replace(/{{.*?!}}[\s\S]*?{{!.*?}}/g, '');
        pattern = pattern.replace(/{{.*?:}}[\s\S]*?{{:.*?}}/g, '');
        pattern = pattern.replace(/{{.*?}}/g, '');

        return pattern;
    }

};