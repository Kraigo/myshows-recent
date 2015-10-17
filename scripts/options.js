function saveOptions(e) {
	e.preventDefault();

	chrome.storage.sync.set({
		notification: form.elements['notification'].checked,
		badge: form.elements['badge'].checked,
		resources: function() {
			var resources = [];
			for (var i in form.elements['resources']) {
				var res = form.elements['resources'][i];
				if (res.checked) {
					resources.push(res.value);
				}
			}
			return resources;
		}()
	}, function() {
		document.getElementById('status').style.opacity = 1;
		setTimeout(function() {
			document.getElementById('status').style.opacity = 0;
		}, 1300)

	});
}

function restoreOptions() {
	api.getOptions(function(options) {
		form.elements['notification'].checked = options.notification;
		form.elements['badge'].checked = options.badge;


		for (var i in form.elements['resources']) {
			var res = form.elements['resources'][i];

			if (options.resources.indexOf(res.value) >= 0) {
				res.checked = true;
			}
		}

	});
}

restoreOptions();
form.addEventListener('submit', saveOptions);