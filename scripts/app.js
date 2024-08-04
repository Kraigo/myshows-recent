var app = {
    options: null,
    defaultOptions: {
        auth: null, // {accessToken, refreshToken}
        user: null,
        tempUserId: null,
        notification: true,
        rate: false,
        pin: true,
        resources: ['hdrezka'],
        customResources: [],
        pinned: [],
        language: null,
        context: true,
        autoRefresh: false,
        showOnBadge: 'shows',
        badgeColor: null,
        shownAnnounces: []
    },
    
    login: function(login, password) {
        return api.token(login, password)
            .then(function(res) {                
                return app.setAuthorization(res);
            })
            .then(function() {
                return api.profile()
            })
            .then(function(res) {
                app.setOptions({'user': res.user});
            });
    },

    setAuthorization: function(res) {
        return new Promise(function(resolve) {
            var tokenData = {
                accessToken: res.access_token,
                refreshToken: res.refresh_token,
                tokenType: res.token_type
            };
            app.options.auth = tokenData;
            app.setOptions({'auth': tokenData }, resolve);
        });
    },

    logout: function() {
        chrome.storage.local.clear() 
        app.updateBadge('');
        chrome.storage.sync.remove(['auth', 'user', 'unwatched']);
    },

    // profile: function(callback) {
    //     this.get('profile/', callback);
    // },

    updateUnwatched: function() {
        return api.unwatchedEpisodesList()
            .then(function(data) {
                return persistent.update('unwatched', JSON.stringify(data))
                    .then(function() {
                        return data;
                    });
            });
    },

    isAuthorized: function(callback) {
        chrome.storage.sync.get({ auth: null }, function(options) {
            callback(!!app.getAuth(options));
        });
    },

    getAuth: function(options) {
        options = options || app.options;
        return options.auth && options.auth.accessToken
            ? options.auth
            : null;
    },

    numFormat: function(num, pad) {
        return ((pad ||'00') + num.toString()).substr(num.toString().length);
    },    

    dateFormat: function(date, format) {
        date = new Date(date);
        format = format || 'DD.MM.YYYY';
        return format
            .replace('YYYY', date.getFullYear())
            .replace('MM', app.numFormat(date.getMonth() + 1, '00'))
            .replace('DD', app.numFormat(date.getDate(), '00'));
    },

    updateBadge: function(num) {
        if (num) {
            chrome.action.setBadgeText({ text: num.toString() });
            chrome.action.setBadgeBackgroundColor({
                color: app.options.badgeColor || [0, 0, 0, 0]
            });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }

    },    

    updateUnwatchedBadge: function() {
        persistent.value('unwatched').then(function(data) {
            var unwatched = data ? JSON.parse(data) : [];
            switch(app.options.showOnBadge) {
                case 'episodes': {
                    var count = app.getUnwatchedEpisodes(unwatched).length;
                    app.updateBadge(count);
                    break;
                }
                case 'shows': {
                    var count = app.getUnwatchedShows(unwatched).length;
                    app.updateBadge(count);
                    break;
                }
                case 'hide':
                default: {
                    app.updateBadge();
                    break;
                }
            }
        });
    },

    initialize: function(callback) {
        app.getOptions(function(options) {
            if (!options.language) {
                app.setOptions({
                    language: app.getCurrentLanguage(),
                    shownAnnounces: $announces
                        .filter(a => !a.forAll)
                        .map(a => a.id)
                }, callback)
            } else if (typeof callback === 'function') {
                callback(options);
            }
        })
    },

    getOptions: function(callback) {
        chrome.storage.sync.get(app.defaultOptions, function(options) {
            app.options = options || app.defaultOptions;
            
            if (typeof callback === 'function') {
                callback(app.options);
            }
        });
    },

    setOptions: function(options, callback) {
        chrome.storage.sync.set(options, function() {
            for (var p in options) {
                app.options[p] = options[p];
            }
            if (typeof callback === 'function') {
                callback(app.options);
            }
        });
    },

    getUnwatched() {
        var data = persistent.valueLocal('unwatched');
        var unwatched = data ? JSON.parse(data) : null;
        return Array.isArray(unwatched) ? unwatched : [];
    },

    getUnwatchedShows: function(unwatched) {
        unwatched = unwatched || app.getUnwatched();
        return unwatched
            .sort(function(a, b) {
                var dateA = Date.parse(a.episode.airDate);
                var dateB = Date.parse(b.episode.airDate);
                return dateB - dateA;
            })
            .map(function(u) { return u.show })
            .filter(function(s, index, arr) {
                var firstIndex = arr.findIndex(function(a) {
                    return a.id == s.id;
                })
                return firstIndex == index
            });
    },

    getUnwatchedEpisodes: function(unwatched) {
        unwatched = unwatched || app.getUnwatched();
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
            iconUrl: '/images/icon-128.png'
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

    getCurrentLanguage: function() {
        const language = navigator.language.slice(0, 2)
        switch (language) {
            case 'ru': 
                return 'ru';
            case 'ua':
            case 'uk':
                return 'ua';
            case 'en':
            default:
                return 'en';
        }
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
        var walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
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

    setLocalizationDomain: function(element) {
        var selector = '[data-domain-href]';
        var domain = app.getLocalization('DOMAIN');
        [].forEach.call(element.querySelectorAll(selector), function(a) {
            a.setAttribute('href', domain);
        })
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
            "contexts": ["selection"]
        });
    },
    removeContextMenu: function() {
        chrome.contextMenus.remove('search')
    },
    hideAnnounce: function(id, callback) {
        const isShown = app.options.shownAnnounces.includes(id);
        if (!isShown) {
            app.setOptions({
                'shownAnnounces': [].concat(app.options.shownAnnounces).concat([id])
            }, callback);
        }
    }

};