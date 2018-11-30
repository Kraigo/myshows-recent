var app = {
    options: null,
    defaultOptions: {
        auth: null, // { login, password }
        token: null,
        notification: true,
        badge: true,
        rate: false,
        pin: true,
        resources: ['seasonvarru', 'hdrezkame'],
        customResources: [],
        pinned: [],
        language: navigator.language.substr(0,2) === 'ru' ? 'ru' : 'en',
        context: true,
        showOnBadge: 'shows'
    },
    
    login: function(login, password) {
        return api.token(login, password)
            .then(function(res) {                
                return app.setAuthorization(res);
            });
    },

    setAuthorization: function(res) {
        return new Promise(function(resolve) {
            var tokenData = {
                accessToken: res.access_token,
                refreshToken: res.refresh_token,
                tokenType: res.token_type
            };
            app.options.token = tokenData;
            app.setOptions({'token': tokenData }, resolve);
        });
    },

    logout: function() {
        localStorage.clear();
        app.updateBadge('');
        chrome.storage.sync.clear();
    },

    // profile: function(callback) {
    //     this.get('profile/', callback);
    // },

    updateUnwatched: function() {
        return api.unwatchedEpisodesList()
            .then(function(data) {
                app.localSave('unwatched', data);
                return data;
            });
    },

    isAuthorized: function(callback) {
        chrome.storage.sync.get({ token: null }, function(options) {
            callback(!!(options.token && options.token.accessToken));
        });
    },

    localSave: function(key, data) {
        localStorage[key] = JSON.stringify(data);
    },

    localGet: function(key) {
        return localStorage[key] ? JSON.parse(localStorage[key]) : false;
    },

    numFormat: function(num) {
        return ('00' + num.toString()).substr(num.toString().length);
    },

    updateBadge: function(num) {
        if (num)
            chrome.browserAction.setBadgeText({ text: num.toString() });
        else {
            chrome.browserAction.setBadgeText({ text: '' });
        }

    },    

    updateUnwatchedBadge: function() {
        switch(app.options.showOnBadge) {
            case 'episodes': {
                app.updateBadge(app.getUnwatchedEpisodes().length);
                break;
            }
            case 'shows':
            default: {
                app.updateBadge(app.getUnwatchedShows().length);
                break;
            }
        }
    },

    getOptions: function(callback) {
        chrome.storage.sync.get(app.defaultOptions, function(options) {
            app.options = options;
            callback(options);
        });
    },

    setOptions: function(options, callback) {
        chrome.storage.sync.set(options, callback);
    },

    getUnwatched() {
        return app.localGet('unwatched');
    },

    getUnwatchedShows: function(unwatched) {
        unwatched = unwatched || app.getUnwatched() || [];

        return unwatched
            .map(function(u) { return u.show })
            .filter(function(s, index, arr) {
                var firstIndex = arr.findIndex(function(a) {
                    return a.id == s.id;
                })
                return firstIndex == index
            });
    },

    getUnwatchedEpisodes: function(unwatched) {
        unwatched = unwatched || app.getUnwatched() || [];
        return unwatched
            .map(function(u) { return u.episode })
            .sort(function(a, b) {
                var dateA = Date.parse(a.airDate);
                var dateB = Date.parse(b.airDate);
                return dateB - dateA;
            })
    },

    notification: function(type, title, body, image) {
        var msgOptions = {
            type: type,
            title: title,
            iconUrl: 'images/icon-128.png'
        };

        if (type == 'list') {
            msgOptions.message = '';
            msgOptions.items = body;
        } else if (type == 'image') {
            msgOptions.message = body;
            msgOptions.imageUrl = image
        }

        chrome.notifications.create(null, msgOptions, function() {});
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
    },

    getLocalization: function(localizationKey) {
        return localization[localizationKey][app.options.language];
    },

    getLocalizationTitle: function(show) {
        return app.options.language === 'en' ? (show.titleOriginal || show.title) : show.title
    },
    setLocalization: function(element) {
        var textnode;
        var repKey;
        var language = app.options.language;
        var walk = document.createTreeWalker(element,NodeFilter.SHOW_TEXT, null, false);
        var localizationKeys = Object.keys(localization);
        while(textnode = walk.nextNode()) {
            localizationKeys.forEach(function(loc) {
                repKey = '%' + loc + '%';
                while (textnode.nodeValue.indexOf(repKey) >= 0) {
                    textnode.nodeValue = textnode.nodeValue.replace(repKey, localization[loc][language]);
                }
            })
        }
    },

    groupBy: function(data, key) {
        var group = {};
        data.forEach(function(item) {
            var itemKey = item[key];
            group[itemKey] = group[itemKey] || [];
            group[itemKey].push(item);
        })
        return Object.keys(group).map(function(key) { 
            return group[key];
        });
    },

    setContextMenu: function() {
        chrome.contextMenus.create({
            "id": "search",
            "title": app.getLocalization('SEARCH_CONTEXT_MENU'),
            "contexts": ["selection"],
            "onclick" : function(e) {
                chrome.tabs.create({
                    url: 'https://myshows.me/search/?q=' + e.selectionText
                })
            }
        });
    },
    removeContextMenu: function() {
        chrome.contextMenus.remove('search')
    }

};