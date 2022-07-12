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
    app.setLocalizationDomain(document.body);

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
        if (auth) {
            if (app.options.user) {
                var domain = app.getLocalization('DOMAIN');
                var user = app.options.user;
                document.getElementById('profileLink').setAttribute("href", domain + '/' + user.login);
            }

            navigateView($views.main);

            if (app.localGet('unwatched')) {
                buildUnwatchedList();
                buildAnnounces();
            } else {
                refreshLists();
            }
        } else {
            app.logout();
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
        .catch(function(res) {
            hideLoading();
            var msg;
            switch (res.error) {
                case 'invalid_grant':
                    msg = app.getLocalization('INVALID_USERNAME_OR_PASSWORD');
                    break;
                case 'invalid_request':
                    msg = app.getLocalization('FILL_ALL_FIELDS');
                    break;
                default: {
                    msg = res.error_description || app.getLocalization('UNEXPECTED_ERROR')
                }
            }
            
            loginMessageElm.style.display = 'block';
            loginMessageElm.innerHTML = msg;
            console.error(res);
        })
}

function refreshLists() {
    showLoading();
    
    app.updateUnwatched()
        .then(function(unwatched) {
            hideLoading();
            buildUnwatchedList(unwatched);
            buildEpisodesList(unwatched);
        })
        .then(function() {            
            app.updateUnwatchedBadge();
        });
}

function buildAnnounces() {
    var announcePattern = document.getElementById('announce-tmp').innerHTML;
    var appAnnounces = document.getElementById('appAnnounces');

    appAnnounces.innerHTML = '';
    
    for (let announce of $announces) {
        const isShown = app.options.shownAnnounces.includes(announce.id);
        if (isShown) {
            continue;
        }
        appAnnounces.innerHTML = app.fillPattern(announcePattern, {
            text: announce.text[app.options.language]
        });

        appAnnounces.querySelector('.announce-close')
            .addEventListener('click', () => {
                app.hideAnnounce(announce.id, () => {
                    buildAnnounces()
                });
            });

        break;
    }

}

function buildUnwatchedList(unwatched) {
    var unwatchedShows = app.getUnwatchedShows(unwatched);
    var unwatchedEpisodes = app.getUnwatchedEpisodes(unwatched);
    
    unwatchedShows.sort(function(a, b) {
        if (app.options.pin) {
            var pinA = app.getPinned(a.id);
            var pinB = app.getPinned(b.id);

            if (pinA && !pinB) return -1;
            if (!pinA && pinB) return 1;
            
        }
        return 0;
    });

    var listPattern = document.getElementById('shows-list-tmp').innerHTML;
    var unwatchedList = document.getElementById('unwatchedList');
    unwatchedList.innerHTML = '';

    unwatchedShows.forEach(function(show) {
        var showEpisodes = unwatchedEpisodes
            .filter(function(e) {
                return e.showId === show.id;
            })
            .sort((a, b) => b.episodeNumber - a.episodeNumber);

        var lastEpisode = showEpisodes[showEpisodes.length - 1];
        var elementLi = document.createElement('li');
        var dataPattern = {
            title: app.getLocalizationTitle(show),
            badge: showEpisodes.length,
            id: show.id,
            seasonNum: app.numFormat(lastEpisode.seasonNumber),
            episodeId: lastEpisode.id,
            episodeNum: app.numFormat(lastEpisode.episodeNumber),
            episodeTitle: lastEpisode.title,
            resources: app.getAllowedResources(app.options.resources),
            pinned: app.getPinned(show.id)
        };

        elementLi.innerHTML = app.fillPattern(listPattern, dataPattern);
        elementLi.querySelector('.shows-mark').addEventListener('click', function(e) {
            e.preventDefault();
            showLoading();

            api.checkEpisode(lastEpisode.id)
                    .then(function() {
                        refreshLists();
                        ga('send', 'event', 'button', 'mark', dataPattern.title, 1);
                    });
        });

        elementLi.querySelector('.show-title-link').addEventListener('click', function(e) {
            e.preventDefault();
            showDetails(show.id);
        });


        if (app.options.pin) {
            setupPinFeature.call(elementLi, show.id);        
        }

        if (app.options.rate) {
            setupRateFeature.call(elementLi, lastEpisode.id);
        }

        if (isShowRecent(lastEpisode)) {
            elementLi.classList.add('shows-recent');
        }

        unwatchedList.appendChild(elementLi);
    });

    setupGoogleAnalytics();

}


function buildEpisodesList() {

    var param = viewParam();

    if (!(param && param.showId)) return;

    var showId = param.showId;
    var unwatchedShows = app.getUnwatchedShows();
    var show = unwatchedShows.find(function(s) { return s.id === showId });
    if (show === undefined) {
        var view = activeView();
        if (view === $views.details) {
            navigateView($views.main);
        }
        return;
    }


    var episodes = app.getUnwatchedEpisodes()
        .filter(function(e) {
            return e.showId === showId
        })
        .sort(function(a, b) {
            return a.episodeNumber - b.episodeNumber;
        });

    var listPattern = document.getElementById('episode-list-tmp').innerHTML;
    var listHeadPattern = document.getElementById('episode-list-head-tmp').innerHTML;
    var listHeaderPattern = document.getElementById('episode-header-tmp').innerHTML;
    var episodesList = document.getElementById('showEpisodesList');
    var showEpisodesHeader = document.getElementById('showEpisodesHeader');

    episodesList.innerHTML = '';
    showEpisodesHeader.innerHTML = '';
    appAnnounces.innerHTML = '';

    showEpisodesHeader.innerHTML = app.fillPattern(listHeaderPattern, {
        showId: show.id,
        title: app.getLocalizationTitle(show),
        image: show.image
    });


    showEpisodesHeader.querySelector('img')
        .addEventListener('load', function(e) {
            e.target.classList.add('loaded');
        });

    showEpisodesHeader.querySelector('.shows-return')
        .addEventListener('click', function(e) {
            e.preventDefault();
            navigateView($views.main)
        });

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
                episodeId: episode.id,
                title: episode.title,
                seasonNum: app.numFormat(episode.seasonNumber),
                episodeNum: app.numFormat(episode.episodeNumber),
                airDate: app.dateFormat(episode.airDate, 'DD.MM.YYYY')
            };    

            elementLi.innerHTML = app.fillPattern(listPattern, dataPattern);   

            elementLi.querySelector('.shows-mark').addEventListener('click', function(e) {
                e.preventDefault();
                showLoading();
                api.checkEpisode(episode.id)
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
    param = param === undefined ? '' : JSON.stringify(param);
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
    var param = elm.getAttribute('data-param');
    return param ? JSON.parse(param) : null;
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
    showLoading();
    api.search(q).then(function(shows) {
        hideLoading();       
        var searchPattern = document.getElementById('search-list-tmp').innerHTML;
        var searchList = document.getElementById('searchList');
        searchList.innerHTML = '';

        if (!shows.length) {
            var elementLi = document.createElement('li');
            elementLi.innerHTML = app.getLocalization('NOTHING_FOUND');
            elementLi.style.textAlign = 'center';
            searchList.appendChild(elementLi);
            return;
        }

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

function showDetails(showId) {
    navigateView($views.details, {showId: showId});
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

function isShowRecent(episode) {
    return new Date() - Date.parse(episode.airDate) < 86400000 * 2;
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
    
function setupPinFeature(showId) {
    var elementLi = this;
    var pressTimer;
    var pinElement = elementLi.querySelector('.shows-title');

    pinElement.addEventListener('mousedown', function(event) {
        pressTimer = setTimeout(function() {
            pinShows(showId);
            buildUnwatchedList();
        }, 500)
    });

    ['mouseup', 'mousemove', 'mouseout'].forEach(function(eventName) {
        pinElement.addEventListener(eventName, function() {
            clearTimeout(pressTimer);
        });
    });
}

function setupRateFeature(lastEpisodeId) {
    var elementLi = this;
    elementLi.querySelector('.shows-rate').style.display = 'inline-block';
    elementLi.querySelector('.shows-rate').addEventListener('change', function(val) {
        showLoading();
        api.rateEpisode(lastEpisodeId, this.value)
            .then(function() {
                refreshLists();
            });
    });
}

//

document.addEventListener("DOMContentLoaded", function() {
    app.initialize(init);
});
