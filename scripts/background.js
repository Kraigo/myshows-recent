var BACKGROUND_REFRESH_INTERVAL = 2700000;

function init() {
    checkNewEpisodes();

    if (app.options.context) {
        app.setContextMenu();
    }
}

function checkNewEpisodes() {

    app.isAuthorized(function(auth) {
        if (!auth) return;

        app.getOptions(function(options) {
            Promise.all([
                app.updateShows(),
                app.updateEpisodes()
            ]).then(function(res) {
                var shows = res[0];
                var unwatched = res[1];

                if (options.notification && unwatched) {
                    var newEpisodes = getNewEpisodes(unwatched);
                    if (newEpisodes.length) {
                        createNotification(shows, newEpisodes);
                    }
                }
                
                if (options.badge && shows) {
                    app.updateUnwatchedBadge();
                }
            })
        });
    });

    setTimeout(checkNewEpisodes, BACKGROUND_REFRESH_INTERVAL)
}

function getNewEpisodes(unwatched) {
    var newEpisodes = [];
    var localUnwatched = app.localGet('unwatched');
    for (var i in unwatched) {
        var matched = false;
        for (var j in localUnwatched) {
            if (unwatched[i].episodeId == localUnwatched[j].episodeId) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            newEpisodes.push(unwatched[i]);
        }
    }
    return newEpisodes;
}

function createNotification(shows, newEpisodes) {
    if (newEpisodes.length == 1) {

        var episode = newEpisodes[0];
        var show = shows[episode.showId];
        var message = app.getLocalizationTitle(show) + '\n' +
            's' + app.numFormat(episode.seasonNumber) +
            'e' + app.numFormat(episode.episodeNumber) +
            ' ' + episode.title;
        var title = app.getLocalization('NEW_EPISODE');
        var image = show.image;

        app.notification('image', title, message, image);

    } else {

        var items = [];

        for (var i in newEpisodes) {
            var episode = newEpisodes[i];
            var show = shows[episode.showId];
            items.push({
                title: app.getLocalizationTitle(show),
                message: 's' + app.numFormat(episode.seasonNumber) +
                    'e' + app.numFormat(episode.episodeNumber) +
                    ' ' + episode.title
            });
        }

        var title = app.getLocalization('NEW_EPISODE') + ' (' + items.length + ')';

        app.notification('list', title, items);
    }

};


// # # #
app.getOptions(init)


chrome.runtime.onMessage.addListener(function(msg) {
    console.log(msg);
});


  

