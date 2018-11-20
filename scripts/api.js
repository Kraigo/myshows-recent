var api = {
    baseUrl: 'https://myshows.me',
    jsonrpcVersion: '2.0',
    clientId: 'myshows_kraigo',
    clientSecret: '',
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
                        resolve(response);
                    } catch(e) {
                        reject(xhr.response);
                    }
                }
            }
            
            xhr.send(body);
        });
    },

    submit: function(method, url, data) {
        var urlEncodedData = "";
        var urlEncodedDataPairs = [];
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        for(var name in data) {
            urlEncodedDataPairs.push(
                encodeURIComponent(name)
                + '='
                + encodeURIComponent(data[name])
            );
        }

        urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

        return api.request(method, url, urlEncodedData, headers);
    },

    fetch: function(method, params) {
        var url = api.baseUrl + '/v2/rpc/';
        var headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Bearer ' + app.options.token
        }
        var body =  {
            jsonrpc: api.jsonrpcVersion,
            method: method,
            params: params,
            id: 1
        }
        return api.request(method, url, body, headers)
            .then(function(response) {
                if (!response.error) {
                    return Promise.resolve(response.result);
                } else {                        
                    return Promise.reject(response.error);
                }
            });
    },

    authorize: function(username, password) {
        var url = api.baseUrl + '/oauth/token';      
        var data = {
            'grant_type': 'password',
            'client_id': api.clientId,
            'client_secret': api.clientSecret,
            'username': username,
            'password': password
        }
        return api.submit("POST", url, data);
    },
    
    profile: function(login) {
        var method = 'profile.Get';
        var params = {
            login: login
        };
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

}