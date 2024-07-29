try {
    importScripts(
        '/scripts/polyfills.js',
        '/scripts/resources.js',
        '/scripts/announces.js',
        '/scripts/localization.js',
        '/scripts/persistent.js',
        '/scripts/api.js',
        '/scripts/app.js',
    );
} catch (e) {
    console.error(e);
}


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

            persistent.value('unwatched')
                .then(function(localUnwatched) {

                    app.updateUnwatched()
                        .then(function(unwatched) {
                            if (options.notification && unwatched) {
                                var newItems = unwatched.filter(u => {
                                    return !localUnwatched.some(function(l) {
                                        return l.episode.id === u.episode.id;
                                    })
                                });
        
                                if (newItems.length) {
                                    createNotification(newItems);
                                }
                            }
                            
                            if (options.badge && unwatched) {
                                app.updateUnwatchedBadge();
                            }
                        });
                });
        });
    });

    setTimeout(checkNewEpisodes, BACKGROUND_REFRESH_INTERVAL)
}

function createNotification(newItems) {
    if (newItems.length == 1) {

        var episode = newItems[0].episode;
        var show = newItems[0].show;
        var message = app.getLocalizationTitle(show) + '\n' +
            's' + app.numFormat(episode.seasonNumber) +
            'e' + app.numFormat(episode.episodeNumber) +
            ' ' + episode.title;
        var title = app.getLocalization('NEW_EPISODE');
        var image = show.image.replace('https://', 'http://');

        app.notification('image', title, message, image);

    } else {

        var items = [];

        for (var i in newItems) {
            var episode = newItems[i].episode;
            var show = newItems[i].show;
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
app.initialize(init)

chrome.runtime.onMessage.addListener(function(msg) {
    console.log(msg);
});

chrome.contextMenus.onClicked.addListener(function(e) {
    chrome.tabs.create({
        url: app.getLocalization('DOMAIN') + '/search/?q=' + e.selectionText
    });
});