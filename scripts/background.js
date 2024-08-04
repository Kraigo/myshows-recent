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
}

var BACKGROUND_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 min
var startTimer;
var intervalTimer;

function init() {
    console.log('Background initialized');
    checkNewEpisodes();
    app.updateContextMenu();
    app.updateUnwatchedBadge();
    stopBackground();

    startTimer = setTimeout(checkNewEpisodes, 100);
    intervalTimer = setInterval(checkNewEpisodes, BACKGROUND_REFRESH_INTERVAL);
}

function stopBackground() {
    clearInterval(intervalTimer);
    clearTimeout(startTimer);
}

function checkNewEpisodes() {

    app.isAuthorized(function(auth) {
        if (!auth) return;

        app.getOptions(function(options) {

            persistent.value('unwatched')
                .then(function(unwatched) {
                    var localUnwatched = unwatched ? JSON.parse(unwatched) : [];

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
                            
                            if (options.badge) {
                                app.updateUnwatchedBadge();
                            }
                        });
                });
        });
    });
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
        var image = show.image;

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
chrome.runtime.onInstalled.addListener(function() {
    app.initialize(init);
});

chrome.runtime.onStartup.addListener(function() {
    app.initialize(init);
});

chrome.runtime.onUpdateAvailable.addListener(function() {
    app.initialize(init);
});

chrome.runtime.onRestartRequired.addListener(function() {
    app.initialize(init);
});

chrome.runtime.onSuspend.addListener(function() {
    stopBackground();
});

chrome.contextMenus.onClicked.addListener(function(e) {
    chrome.tabs.create({
        url: app.getLocalization('DOMAIN') + '/search/?q=' + e.selectionText
    });
});