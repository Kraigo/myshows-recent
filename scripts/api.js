var api = {
    baseUrl: 'https://api.myshows.me',
    authUrl: 'https://myshows.me/oauth/token',
    jsonrpcVersion: '2.0',
    clientId: 'myshows_kraigo',
    clientSecret: 'nmpV1yf8Mg6H3WuhOp6WHadV',
    redirectUrl: 'myshows://oauth-callback/myshows',


    listNames: {
        favorites: 'favorites',
        ignored: 'ignored',
        unwatched: 'unwatched',
        next: 'next',
    },

    request: function(method, url, body, headers) {
        return new Promise(function(resolve, reject) {        
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
    
            for (var key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (!xhr.status) return;
    
                    try {
                        var response = JSON.parse(xhr.response);

                        if (xhr.status >= 200 && xhr.status < 400) {
                            resolve(response);
                        } else {
                            reject(response);
                        }
                    } catch(e) {
                        reject(xhr.response);
                    }
                }
            }
            
            xhr.send(body);
        });
    },

    submit: function(method, url, data) {
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        var urlencodedData = api.encodeData(data);

        return api.request(method, url, urlencodedData, headers);
    },

    fetch: function(method, params) {
        var auth = app.getAuth();

        if (!auth) return Promise.reject('Auhtorization not provided');

        var url = api.baseUrl + '/v2/rpc/';
        var headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth.accessToken
        }
        var body =  JSON.stringify({
            jsonrpc: api.jsonrpcVersion,
            method: method,
            params: params,
            id: 1
        });

        return api.request("POST", url, body, headers)
            .then(function(response) {
                if (!response.error) {
                    return Promise.resolve(response.result);
                } else {                        
                    return Promise.reject(response.error);
                }
            })
            .catch(function() {
                if (app.getAuth()) {
                    return api.refresh()
                        .then(function(res) {
                            app.setAuthorization(res);
                            return api.fetch(method, params);
                        })
                        .catch(function() {
                            app.logout();
                            return Promise.reject();
                        });
                }
            });
    },

    encodeData(data) {
        var urlEncodedDataPairs = [];

        for(var name in data) {
            if (typeof data[name] === 'object') {
                for (var oname in data[name]) {
                    urlEncodedDataPairs.push(
                        encodeURIComponent(name + '[' + oname + ']')
                        + '='
                        + encodeURIComponent(data[name][oname])
                    );
                }
            } else {
                urlEncodedDataPairs.push(
                    encodeURIComponent(name)
                    + '='
                    + encodeURIComponent(data[name])
                );
            }
            
        }

        return urlEncodedDataPairs.join('&').replace(/%20/g, '+');
    },

    token: function(username, password) {
        var url = api.authUrl;      
        var data = {
            'grant_type': 'password',
            'client_id': api.clientId,
            'client_secret': api.clientSecret,
            'username': username,
            'password': password
        }
        return api.submit("POST", url, data);
    },

    refresh: function() {
        var auth = app.getAuth();
        var url = api.authUrl;      
        var data = {
            'grant_type': 'refresh_token',
            'client_id': api.clientId,
            'client_secret': api.clientSecret,
            'refresh_token': auth.refreshToken
        }
        return api.submit("POST", url, data);
    },
    
    profile: function(login) {
        var method = 'profile.Get';        
        var params = {};
        if (login) {
            params.login = login;
        }
        return api.fetch(method, params);
    },

    unwatchedShowsList: function() {
        var method = 'lists.Shows';
        var params = {
            list: api.listNames.unwatched
        };
        return api.fetch(method, params);
    },

    unwatchedEpisodesList: function() {
        var method = 'lists.Episodes';
        var params = {
            list: api.listNames.unwatched
        };
        return api.fetch(method, params);
    },

    watchedEpisodesList: function() {
        var method = 'lists.Episodes';
        var params = {
            list: api.listNames.watched
        };
        return api.fetch(method, params);
    },

    checkEpisode: function(episodeId) {
        var method = 'manage.CheckEpisode';
        var params = {
            id: episodeId,
            rating: 0
        };
        return api.fetch(method, params);
    },
    
    rateEpisode: function(episodeId, rate) {
        var method = 'manage.RateEpisode';
        var params = {
            id: episodeId,
            rating: rate
        };
        return api.fetch(method, params);
    },

    unRateEpisode: function(episodeId) {
        var method = 'manage.UnCheckEpisode';
        var params = {
            id: episodeId
        };
        return api.fetch(method, params);
    },
    
    
    search: function(q) {
        var method = 'shows.Search';
        var params = {
            query: q
        };
        return api.fetch(method, params);
    },

    show: function(showId) {
        var method = 'shows.GetById';
        var params = {
            showId: showId,
            withEpisodes: true
        };
        return api.fetch(method, params);
    }

}