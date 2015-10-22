setInterval(function() {
	if (!app.isAuthorized()) return;

	app.unwatched(function(unwatched) {

		if (!unwatched) return;

		var newEpisodes = getNewEpisodes(unwatched);
		if (newEpisodes.length) createNotification(newEpisodes);

		app.localSave('unwatched', unwatched);
		app.updateBadge(app.getUnwatchedShows().length);			
		
	})
}, 2700000);

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

function createNotification(newEpisodes) {
	app.shows(function(shows){
		if (newEpisodes.length == 1) {

			var episode = newEpisodes[0]
			var show = shows[episode.showId];
			var message = (show.ruTitle || show.title) + '\n' + 's' + app.numFormat(episode.seasonNumber) + 'e' + app.numFormat(episode.episodeNumber) + ' ' + episode.title;
			var title = 'Новый эпизод';
			var image = show.image;

			app.notification('image', title, message, image);		

		} else {

			var items = [];

			for (var i in newEpisodes) {
				var episode = newEpisodes[i];
				var show = shows[episode.showId];
				items.push({
					title: (show.ruTitle || show.title),
					message: 's' + app.numFormat(episode.seasonNumber) + 'e' + app.numFormat(episode.episodeNumber) + ' ' + episode.title
				});
			}

			var title = 'Новый эпизод ('+items.length+')';

			app.notification('list', title, items);
		}

		app.localSave('shows', shows);

	});

};