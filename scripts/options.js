function saveOptions(e) {
    e.preventDefault();

    chrome.storage.sync.set({
        notification: form.elements['notification'].checked,
        badge: form.elements['badge'].checked,
        rate: form.elements['rate'].checked,
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
    app.getOptions(function(options) {
        form.elements['notification'].checked = options.notification;
        form.elements['badge'].checked = options.badge;
        form.elements['rate'].checked = options.rate;


        for (var i in form.elements['resources']) {
            var res = form.elements['resources'][i];

            if (options.resources.indexOf(res.value) >= 0) {
                res.checked = true;
            }
        }

    });
}

function customAdd() {
	_customAdd.style.display = 'none';
	_customFields.style.display = '';
}

function customCancel() {
	_customAdd.style.display = '';
	_customFields.style.display = 'none';
}

function customSave() {
    console.log('save');
}

restoreOptions();
form.addEventListener('submit', saveOptions);

var _customFields = document.getElementById('custom-fields');
var _customAdd = document.getElementById('custom-add');
var _customCancel = document.getElementById('custom-cancel');
var _customSave = document.getElementById('custom-save');

_customAdd.addEventListener('click', customAdd);
_customCancel.addEventListener('click', customCancel);
_customSave.addEventListener('click', customSave);