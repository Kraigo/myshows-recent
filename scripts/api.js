var api = {
    baseUrl: "https://myshows.me",
    jsonrpcVersion: "2.0",

    listNames: {
        favorites: 'favorites',
        ignored: 'ignored',
        unwatched: 'unwatched',
        next: 'next',
    },

    request: function(method, url, body, headers) {
        return new Promise(function(resolve, reject) {        
        
            xhr.open(method, url, true);
    
            for (var key in headers) {
                this.xhr.setRequestHeader(key, this.headers[key]);
            }
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (!xhr.status) return;
    
                    try {
                        var response = JSON.parse(xhr.response);
    
                        if (!response.error) {
                            resolve(response.result);
                        } else {                        
                            reject(response.error);
                        }
                    } catch(e) {
                        reject(xhr.response);
                    }
                }
            }
            
            xhr.send(body);
        });
    },

    fetch: function(method, params) {
        var url = this.baseUrl + '/v2/rpc/';
        var headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Bearer ' + app.options.token
        }
        var body =  {
            jsonrpc: this.jsonrpcVersion,
            method: method,
            params: params,
            id: 1
        }
        return this.request(method, url, body, headers);
    },

    authorize: function(username, password) {
        var url = this.baseUrl + '/oauth/authorize';
        var headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'Content-Type': 'application/json; charset=utf-8'
        }
        var body = {
            'grant_type': 'password',
            'client_id': '',
            'client_secret': '',
            'username': username,
            'password': password
        }
        return this.request(method, url, body, headers);
    },
    
    profile: function(login) {
        var method = 'profile.Get';
        var params = {
            login: login
        };
        return this.fetch(method, params);
    },

    unwatchedShowsList: function() {
        var method = 'lists.Shows';
        var params = {
            list: this.listNames.unwatched
        };
        return this.fetch(method, params);
    },

    unwatchedEpisodesList: function() {
        var method = 'lists.Episodes';
        var params = {
            list: this.listNames.unwatched
        };
        return this.fetch(method, params);
    },

    watchedEpisodesList: function() {
        var method = 'lists.Episodes';
        var params = {
            list: this.listNames.watched
        };
        return this.fetch(method, params);
    },

    checkEpisode: function(episodeId) {
        var method = 'manage.CheckEpisode';
        var params = {
            id: episodeId,
            rating: 0
        };
        return this.fetch(method, params);
    },
    
    rateEpisode: function(episodeId, rate) {
        var method = 'manage.RateEpisode';
        var params = {
            id: episodeId,
            rating: rate
        };
        return this.fetch(method, params);
    },

    unRateEpisode: function(episodeId) {
        var method = 'manage.UnCheckEpisode';
        var params = {
            id: episodeId
        };
        return this.fetch(method, params);
    },
    
    
    search: function(q) {
        var method = 'shows.Search';
        var params = {
            query: q
        };
        return this.fetch(method, params);
    },

}