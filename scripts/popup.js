'use strict';

var $views = {
    login: 'loginView',
    main: 'showsView',
    details: 'detailsView'
}

function init(chromeOptions) {
    var searchTimer;
    app.options = chromeOptions;

    app.setLocalization(document.body);

    app.updateUnwatchedBadge();

    document.getElementById('refreshBtn').addEventListener('click', refreshLists);
    document.getElementById('logoutBtn').addEventListener('click', function() {
        app.logout();
        navigateView($views.login);
    });
    document.getElementById('backBtn').addEventListener('click', function() {
        navigateView($views.main)
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
        // TODO update
        if (auth) {

            var pr = app.options.language == 'ru' ? '' : app.options.language + '.';
            document.getElementById('profileLink').setAttribute("href", 'https://' + pr + 'myshows.me/' + auth.login);

            navigateView($views.main);

            if (app.localGet('shows') && app.localGet('unwatched')) {
                buildUnwatchedList();
            } else {
                refreshLists();
            }
        } else {
            navigateView($views.login);
        }
    })
}

function authorize() {
    showLoading();
    var loginMessageElm = document.getElementById('loginMessage');
    loginMessageElm.style.display = 'none';

    var login = authForm.login.value;
    var password = authForm.password.value;

    app.login(login, password)
        .then(function() {
            authForm.login.value = '';
            authForm.password.value = '';

            // TODO Update profile

            navigateView($views.main);
            refreshLists();
        })
        .catch(function(err) {
            if (err.status == 403) {
                loginMessageElm.style.display = 'block';
                loginMessageElm.innerHTML = app.getLocalization('INVALID_USERNAME_OR_PASSWORD');
            } else if (err.status == 404) {
                loginMessageElm.style.display = 'block';
                loginMessageElm.innerHTML = app.getLocalization('FILL_ALL_FIELDS');
            } else {
                loginMessageElm.style.display = 'block';
                loginMessageElm.innerHTML = app.getLocalization('UNEXPECTED_ERROR');
            }
        })
}

function refreshLists() {
    showLoading();
    Promise.all([
        app.updateShows(),
        app.updateEpisodes()
    ])
    .then(function(res) {
        hideLoading();
        buildUnwatchedList();
        buildEpisodesList();
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

            api.checkEpisode(lastEpisode.episodeId)
                    .then(function() {
                        refreshLists();
                        ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
                    });
        });

        elementLi.querySelector('.show-title-link').addEventListener('click', function(e) {
            e.preventDefault();
            showDetails(show);
        });


        if (app.options.pin) {
            setupPinFeature();        
        }

        if (app.options.rate) {
            setupRateFeature();
        }

        if (isShowRecent(show)) {
            elementLi.classList.add('shows-recent');
        }

        unwatchedList.appendChild(elementLi);
    });

    setupGoogleAnalytics();

}


function buildEpisodesList() {

    var showId = viewParam();

    if (!showId) return;

    var unwatchedShows = app.getUnwatchedShows();
    var show = unwatchedShows.find(function(s) { return s.showId == showId });
    if (show === undefined) {
        var view = activeView();
        if (view === $views.details) {
            navigateView(view.main);
        }
        return;
    }


    var episodes = show.unwatchedEpisodesData;    
    var listPattern = document.getElementById('episode-list-tmp').innerHTML;
    var listHeadPattern = document.getElementById('episode-list-head-tmp').innerHTML;
    var listHeaderPattern = document.getElementById('episode-header-tmp').innerHTML;
    var episodesList = document.getElementById('showEpisodesList');
    var showEpisodesHeader = document.getElementById('showEpisodesHeader');
    
    episodes.sort(function(a, b) {
        return a.episodeNumber - b.episodeNumber;
    });

    episodesList.innerHTML = '';
    showEpisodesHeader.innerHTML = '';

    showEpisodesHeader.innerHTML = app.fillPattern(listHeaderPattern, {
        showId: show.showId,
        title: app.getLocalizationTitle(show),
        image: show.image
    });

    showEpisodesHeader.querySelector('.shows-return')
        .addEventListener('click', function(e) {
            e.preventDefault();
            navigateView($views.main)
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
                api.checkEpisode(episode.episodeId)
                    .then(function() {
                        refreshLists();
                        ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
                    });
            });
            
            episodesList.appendChild(elementLi);
        });
        
    })

    setupGoogleAnalytics();

}

function navigateView(viewName, param) {
    for (var view in $views) {
        var viewId = $views[view];
        var elm = document.getElementById(viewId);
        if (viewId == viewName) {
            elm.style.display = 'block';
            elm.classList.add('active-view');
            elm.setAttribute('data-param', param);
        } else {
            elm.style.display = 'none';
            elm.classList.remove('active-view');
            elm.setAttribute('data-param', '');
        }
    }
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
    api.search(q, function(data) {        
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

function showDetails(show) {
    navigateView($views.details, show.showId);
    var mainWidth = document.getElementById('showsView').clientWidth;
    document.getElementById($views.details).style.width = mainWidth + 'px';

    buildEpisodesList();
}

// ==== UTILITY


function isMouseLeft(event) {
    if ('buttons' in event) {
        return event.buttons === 1;
    } else if ('which' in event) {
        return event.which === 1;
    } else {
        return event.button === 1;
    }
}

function isShowRecent(show) {
    return new Date() - app.getEpisodeDate(show.unwatchedEpisodesData[0].airDate) < 86400000 * 2;
}

// ==== SETUPS FEATURES


function setupGoogleAnalytics() {
    var resourceLinks = document.querySelectorAll('#unwatchedList .shows-resources a');

    [].forEach.call(resourceLinks, function(link) {
        link.addEventListener('click', function() {
            ga('send', 'event', 'link', 'resource', link.getAttribute('href'), 1);
        })
    })
}
    
function setupPinFeature() {
    var pressTimer;
    var pinElement = elementLi.querySelector('.shows-title');

    pinElement.addEventListener('mousedown', function(event) {
        pressTimer = setTimeout(function() {
            pinShows(show.showId);
            buildUnwatchedList();
        }, 500)
    });

    ['mouseup', 'mousemove', 'mouseout'].forEach(function(eventName) {
        pinElement.addEventListener(eventName, function() {
            clearTimeout(pressTimer);
        });
    });
}

function setupRateFeature() {
    elementLi.querySelector('.shows-rate').style.display = 'inline-block';
    elementLi.querySelector('.shows-rate').addEventListener('change', function(val) {
        showLoading();
        api.rateEpisode(lastEpisode.episodeId, this.value)
            .then(function() {
                refreshLists();
            });
    });
}

//

document.addEventListener("DOMContentLoaded", function() {
    app.getOptions(init);
});
