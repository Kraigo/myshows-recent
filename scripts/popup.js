'use strict';

function init(chromeOptions) {
    var searchTimer;
    app.options = chromeOptions;

    app.setLocalization(document.body);

    document.getElementById('refreshBtn').addEventListener('click', updateShows);
    document.getElementById('logoutBtn').addEventListener('click', function() {
        app.logout();
        showView('loginView');
    });

    document.getElementById('authForm').addEventListener('keyup', function(e) {
        if (e.which == 13) {
            e.preventDefault();
            authorize();
        }
    });
    document.getElementById('authFormSubmit').addEventListener('click', authorize);
    document.getElementById('searchBtn').addEventListener('click', toggleSearchView);    
    document.getElementById('searchInput').addEventListener('keyup', function() {
        var q = this.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            if (q) {
                search(q);
            }
        }, 400);
    });

    app.isAuthorized(function(auth) {
        if (auth) {

            document.getElementById('profileLink').setAttribute("href", 'https://myshows.me/' + auth.login);

            showView('showsView');

            if (app.localGet('shows') && app.localGet('unwatched')) {
                buildUnwatchedList();
            } else {
                updateShows();
            }
        } else {
            showView('loginView');
        }
    })
}

function authorize() {
    showLoading();
    document.getElementById('loginMessage').style.display = 'none';

    var login = authForm.login.value;
    var password = md5(authForm.password.value);

    app.login(login, password, function(data, status) {
        hideLoading();
        if (status == 200) {
            authForm.login.value = '';
            authForm.password.value = '';

            app.setOptions({ auth: { login: login, password: password } }, function() {
                showView('showsView');
                updateShows();
            })
        } else if (status == 403) {
            document.getElementById('loginMessage').style.display = 'block';
            document.getElementById('loginMessage').innerHTML = app.getLocalization('INVALID_USERNAME_OR_PASSWORD');
        } else if (status == 404) {
            document.getElementById('loginMessage').style.display = 'block';
            document.getElementById('loginMessage').innerHTML = app.getLocalization('FILL_ALL_FIELDS');
        }
    });
}

function updateShows() {
    showLoading();

    app.shows(function(data, status) {
        if (status == 401) return;

        app.localSave('shows', data);

        app.unwatched(function(data) {
            app.localSave('unwatched', data);
            hideLoading();
            buildUnwatchedList();
        });
    });
}

function buildUnwatchedList() {
    var unwatchedShows = app.getUnwatchedShows();

    unwatchedShows.sort(function(a, b) {
        var pinA, pinB;

        var dateA = app.getEpisodeDate(a.unwatchedEpisodesData[0].airDate);
        var dateB = app.getEpisodeDate(b.unwatchedEpisodesData[0].airDate);

        if (app.options.pin) {
            var pinA = app.getPinned(a.showId);
            var pinB = app.getPinned(b.showId);

            if (pinA && !pinB) {
                return -1;
            } else if (!pinA && pinB) {
                return 1;
            }
        }
        return dateB - dateA;
    });

    // if (app.options.pin) {
    //     for (var i = 0; i < unwatchedShows.length; i++) {
    //         if (app.getPinned(unwatchedShows[i].showId)) {
    //             unwatchedShows.splice(0, 0, unwatchedShows.splice(i, 1)[0]);
    //         }
    //     }
    // }

    var listPattern = document.getElementById('shows-list-tmp').innerHTML;
    var unwatchedList = document.getElementById('unwatchedList');
    unwatchedList.innerHTML = '';

    app.updateBadge(unwatchedShows.length);

    unwatchedShows.forEach(function(show) {
        var lastEpisode = show.unwatchedEpisodesData[show.unwatchedEpisodesData.length - 1];
        var elementLi = document.createElement('li');
        var dataPattern = {
            title: app.getLocalizationTitle(show),
            badge: show.unwatchedEpisodesData.length,
            id: show.showId,
            seasonNum: app.numFormat(lastEpisode.seasonNumber),
            episodeId: lastEpisode.episodeId,
            episodeNum: app.numFormat(lastEpisode.episodeNumber),
            episodeTitle: lastEpisode.title,
            resources: app.getAllowedResources(app.options.resources),
            pinned: app.getPinned(show.showId)
        };

        elementLi.innerHTML = app.fillPattern(listPattern, dataPattern);
        elementLi.querySelector('.shows-mark').addEventListener('click', function() {
            showLoading();
            app.checkEpisode(lastEpisode.episodeId, updateShows);
            ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
        });


        if (app.options.pin) {
            var pressTimer;

            elementLi.addEventListener('mousedown', function() {
                pressTimer = setTimeout(function() {
                    pinShows(show.showId);
                    buildUnwatchedList();
                }, 500)
            });
            elementLi.addEventListener('mouseup', function() {
                clearTimeout(pressTimer);
            });
        }

        if (app.options.rate) {
            elementLi.querySelector('.shows-rate').style.display = 'inline-block';
            elementLi.querySelector('.shows-rate').addEventListener('change', function(val) {
                showLoading();
                app.rateEpisode(lastEpisode.episodeId, this.value, updateShows);
            });
        }

        if (new Date() - app.getEpisodeDate(show.unwatchedEpisodesData[0].airDate) < 86400000 * 2) {
            elementLi.className = 'shows-recent';
        }
        unwatchedList.appendChild(elementLi);
    });

    setGoogleAnalytics();

}

function showView(viewName) {
    var views = ['loginView', 'showsView'];
    views.forEach(function(view) {
        if (view == viewName) {
            document.getElementById(view).style.display = 'block';
        } else {
            document.getElementById(view).style.display = 'none';
        }
    })
}

function showLoading() {
    document.getElementById('loading-bar').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-bar').style.display = 'none';
}

function pinShows(id) {
    var pinIndex = app.options.pinned.indexOf(id);
    if (pinIndex < 0) {
        //savePin
        app.options.pinned.push(id);
    } else {
        app.options.pinned.splice(pinIndex, 1);
    }
    app.setOptions({ pinned: app.options.pinned });
    ga('send', 'event', 'press', 'pin');
}

function setGoogleAnalytics() {
    var resourceLinks = document.querySelectorAll('#unwatchedList .shows-resources a');

    [].forEach.call(resourceLinks, function(link) {
        link.addEventListener('click', function() {
            ga('send', 'event', 'link', 'resource', link.getAttribute('href'), 1);
        })
    })
}
function toggleSearchView() {
    var searchView = document.getElementById('searchView');
    var searchInput = document.getElementById('searchInput');
    var searchList = document.getElementById('searchList');
    searchView.style.display = searchView.style.display == 'none' ? 'block' : 'none';
    searchInput.value = '';
    searchInput.focus();
    searchList.innerHTML = '';
    
}
function search(q) {
    app.search(q, function(data) {        
        var searchPattern = document.getElementById('search-list-tmp').innerHTML;
        var searchList = document.getElementById('searchList');
        searchList.innerHTML = '';

        if (!data) {
            var elementLi = document.createElement('li');
            elementLi.innerHTML = app.getLocalization('NOTHING_FOUND');
            elementLi.style.textAlign = 'center';
            searchList.appendChild(elementLi);
            return;
        }

        var shows = app.normalizeShows(data);
        shows.length = 5;

        shows.forEach(function(show) {            
            var elementLi = document.createElement('li');

            var dataPattern = {
                episodeId: show.id,
                title: app.getLocalizationTitle(show),
                year: show.year
            }
            
            elementLi.innerHTML = app.fillPattern(searchPattern, dataPattern);
            searchList.appendChild(elementLi);
        })
    })
}

document.addEventListener("DOMContentLoaded", function() {
    app.getOptions(init);
});
