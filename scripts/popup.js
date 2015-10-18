var options = null;

function init(chromeOptions) {
	options = chromeOptions;
	document.getElementById('refreshBtn').addEventListener('click', updateShows);
	document.getElementById('logoutBtn').addEventListener('click', function(){
		app.logout();
		checkAuth();
	});
	authForm.addEventListener('submit', authorize);
	checkAuth();
};


function checkAuth() {
	if (app.isAuthorized()) {
		document.getElementById('loginView').style.display = 'none';
		document.getElementById('showsView').style.display = 'block';
		updateShows();
	} else {
		document.getElementById('loginView').style.display = 'block';
		document.getElementById('showsView').style.display = 'none';		
	}
};

function authorize(e) {
	e.preventDefault();
	showLoading();
	document.getElementById('loginMessage').style.display = 'none';

	var login = authForm.login.value;
	var password = md5(authForm.password.value);

	app.login(login, password, function(data, status) {
		hideLoading();
		if (status == 200) {
			app.localSave('auth', {login: login, password: password});
			checkAuth();
		} else if (status == 403) {
			document.getElementById('loginMessage').style.display = 'block';
			document.getElementById('loginMessage').innerHTML = 'Неверный логин или пароль'
		}
	});
};

function updateShows() {
	showLoading();
	buildUnwatchedList();

	app.shows(function(data, status) {
		if (status == 401) return;

		app.localSave('shows', data);

		app.unwatched(function(data) {
			app.localSave('unwatched', data);
			hideLoading();
			buildUnwatchedList();
		});
	});
};

function buildUnwatchedList() {
	var unwatchedShows = app.getUnwatchedShows();
	var listPattern = document.getElementById('shows-list-tmp').innerHTML;
	var unwatchedList = document.getElementById('unwatchedList');
	unwatchedList.innerHTML = '';	

	app.updateBadge(unwatchedShows.length);

	unwatchedShows.forEach(function(show) {
		var lastEpisode = show.unwatchedEpisodesData[show.unwatchedEpisodesData.length-1];
		var elementLi = document.createElement('li');
		var dataPattern = {
				title:show.ruTitle || show.title,
				badge: show.unwatchedEpisodesData.length,
				id: show.showId,
				seasonNum: app.numFormat(lastEpisode.seasonNumber),
				episodeNum: app.numFormat(lastEpisode.episodeNumber),
				resources: app.getAllowedResources(options.resources)
			};
		elementLi.innerHTML = fillPattern(listPattern, dataPattern);
		elementLi.querySelector('.shows-check').addEventListener('click', function() {
			app.checkEpisode(lastEpisode.episodeId, updateShows);
		})
		unwatchedList.appendChild(elementLi);

	})

};

function fillPattern(pattern, data, parent) {
  parent = parent ? parent + '.' : '';
  for(var key in data) {
    var dataItem = data[key];
    if (Array.isArray(dataItem)) {
      var reg = new RegExp('{{'+parent+key+':}}([\\s\\S]*){{:'+parent+key+'}}');
      var template = pattern.match(reg)[1];
      var loopResult = '';
      for (var item in dataItem) {
          var loopData = dataItem[item];
          if (typeof loopData == 'string') {
            var escapedKey = dataItem[item].replace(/\W/g, '');
            loopData = {};
            loopData[escapedKey] = [{}];
          }
          loopResult += fillPattern(template, loopData, parent+key);        
      }
      pattern = pattern.replace(reg, loopResult);
    } else {
      var reg = RegExp('{{'+parent+key+'}}', 'g');
      pattern = pattern.replace(reg, dataItem);
    }
  }
  pattern = pattern.replace(/{{.*?:}}[\s\S]*?{{:.*?}}/g, '');
  pattern = pattern.replace(/{{.*?}}/g, '');

  return pattern;
};

function showLoading() {
	document.getElementById('loading-bar').style.display = 'block';
};

function hideLoading() {
	document.getElementById('loading-bar').style.display = 'none';
};

function numFormat(num) {
	(lastEpisode.seasonNumber.toString().length == 1) ? '0' + lastEpisode.seasonNumber : lastEpisode.seasonNumber
}

app.getOptions(init)