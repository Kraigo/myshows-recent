'use strict';

function init(chromeOptions) {
    var searchTimer;
    app.options = chromeOptions;

    app.setLocalization(document.body);

    app.updateUnwatchedBadge();

    document.getElementById('refreshBtn').addEventListener('click', updateShows);
    document.getElementById('logoutBtn').addEventListener('click', function() {
        app.logout();
        navigateView('loginView');
    });
    document.getElementById('backBtn').addEventListener('click', function() {
        navigateView('showsView')
    })

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

            var pr = app.options.language == 'ru' ? '' : app.options.language + '.';
            document.getElementById('profileLink').setAttribute("href", 'https://' + pr + 'myshows.me/' + auth.login);

            navigateView('showsView');

            if (app.localGet('shows') && app.localGet('unwatched')) {
                buildUnwatchedList();
            } else {
                updateShows();
            }
        } else {
            navigateView('loginView');
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
                navigateView('showsView');
                updateShows();
            })
            // if user uses email as login then link to his profile will be invalid
            // so we need to try to get and save user's 'real' login
            app.profile(function (data, status) {
                if (status == 200) {
                  app.setOptions({ auth: { login: data.login }})
                }
            });
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
            buildEpisodesList();
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
        elementLi.querySelector('.shows-mark').addEventListener('click', function(e) {
            e.preventDefault();
            showLoading();
            app.checkEpisode(lastEpisode.episodeId, updateShows);
            ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
        });

        elementLi.querySelector('.show-title-link').addEventListener('click', function(e) {
            e.preventDefault();
            showDetails(show);
        });


        if (app.options.pin) {
            var pressTimer;
            var pinElement = elementLi.querySelector('.shows-title');

            pinElement.addEventListener('mousedown', function(event) {
                // if (isMouseLeft(event) && ['A', 'SELECT'].indexOf(event.target.nodeName) < 0) {
                    pressTimer = setTimeout(function() {
                        pinShows(show.showId);
                        buildUnwatchedList();
                    }, 500)
                // }
            });
            pinElement.addEventListener('mouseup', function() {
                clearTimeout(pressTimer);
            });
            pinElement.addEventListener('mousemove', function() {
                clearTimeout(pressTimer);
            })
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

function buildEpisodesList() {

    var showId = viewParam();

    if (!showId) return;
    
    var unwatchedShows = app.getUnwatchedShows();
    var show = unwatchedShows.find(function(s) { return s.showId == showId });
    if (show === undefined) {
        var view = activeView();
        if (view === 'detailsView') {
            navigateView('showsView');
        }
        return;
    }


    var episodes = show.unwatchedEpisodesData;    
    var listPattern = document.getElementById('episode-list-tmp').innerHTML;
    var listHeadPattern = document.getElementById('episode-list-head-tmp').innerHTML;
    var listHeaderPattern = document.getElementById('episode-header-tmp').innerHTML;
    var episodesList = document.getElementById('showEpisodesList');
    var showEpisodesHeader = document.getElementById('showEpisodesHeader');

    episodesList.innerHTML = '';
    showEpisodesHeader.innerHTML = '';

    episodes.sort(function(a, b) {
        return app.getEpisodeDate(a.airDate) - app.getEpisodeDate(b.airDate);
    });

    showEpisodesHeader.innerHTML = app.fillPattern(listHeaderPattern, {
        showId: show.showId,
        title: app.getLocalizationTitle(show),
        image: show.image
    });

    showEpisodesHeader.querySelector('.shows-return')
        .addEventListener('click', function(e) {
            e.preventDefault();
            navigateView('showsView')
        })

    var episodesGroup = app.groupBy(episodes, 'seasonNumber');
    episodesGroup.forEach(function(group) {
        var firstEpisode = group[0];
        var headElementLi = document.createElement('li');

        var headerDataPattern = {
            seasonNum: app.numFormat(firstEpisode.seasonNumber)
        }
        headElementLi.innerHTML = app.fillPattern(listHeadPattern, headerDataPattern);        
        episodesList.appendChild(headElementLi);
        
        group.forEach(function(episode) {
            var elementLi = document.createElement('li');
            var dataPattern = {
                episodeId: episode.episodeId,
                title: episode.title,
                seasonNum: app.numFormat(episode.seasonNumber),
                episodeNum: app.numFormat(episode.episodeNumber),
                airDate: episode.airDate
            };    

            elementLi.innerHTML = app.fillPattern(listPattern, dataPattern);   

            elementLi.querySelector('.shows-mark').addEventListener('click', function(e) {
                e.preventDefault();
                showLoading();
                app.checkEpisode(episode.episodeId, updateShows);
                ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
            });
            
            episodesList.appendChild(elementLi);
        });
        
    })

    setGoogleAnalytics();

}

function navigateView(viewName, param) {
    var views = ['loginView', 'showsView', 'detailsView'];
    views.forEach(function(view) {
        var elm = document.getElementById(view);
        if (view == viewName) {
            elm.style.display = 'block';
            elm.classList.add('active-view');
            elm.setAttribute('data-param', param);
        } else {
            elm.style.display = 'none';
            elm.classList.remove('active-view');
            elm.setAttribute('data-param', '');
        }
    })
}

function viewParam() {
    var elm = document.querySelector('.view.active-view');
    return elm.getAttribute('data-param');
}

function activeView() {
    var elm = document.querySelector('.view.active-view');
    return elm.getAttribute('id');
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

function isMouseLeft(event) {
    if ('buttons' in event) {
        return event.buttons === 1;
    } else if ('which' in event) {
        return event.which === 1;
    } else {
        return event.button === 1;
    }
}

function showDetails(show) {
    navigateView('detailsView', show.showId);
    var mainWidth = document.getElementById('showsView').clientWidth;
    document.getElementById('detailsView').style.width = mainWidth + 'px';

    buildEpisodesList();
}

document.addEventListener("DOMContentLoaded", function() {
    app.getOptions(init);
});
