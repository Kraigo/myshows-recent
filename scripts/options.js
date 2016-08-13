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

var customOptions = [{
    title: 'Custom 1',
    id: '123',
    link: 'http://custom1.link?s='
}, {
    title: 'Custom 2',
    id: '456',
    link: 'http://custom2.link?s='
}];

function renderCustomOptions() {
    var optionsPattern = document.getElementById('options-list-tmp').innerHTML;
    var customOptionsList = document.getElementById('custom-options');
    customOptionsList.innerHTML = '';

    customOptions.forEach(function(item) {
        var elementLi = document.createElement('li');
        elementLi.innerHTML = app.fillPattern(optionsPattern, item);
        customOptionsList.appendChild(elementLi);
    });
}
renderCustomOptions();

function customAdd() {
    _customAdd.style.display = 'none';
    _customFields.style.display = '';
    _customTitle.focus();
}

function customCancel() {
    _customAdd.style.display = '';
    _customFields.style.display = 'none';
    _customTitle.value = '';
    _customLink.value = '';
}

function customSave() {
    _customError.style.display = 'none';

    if (_customTitle.value && _customLink.value) {
        customOptions.push({
            title: _customTitle.value,
            link: _customLink.value,
            id: _customTitle.value.toLowerCase().replace(/[^\w]/g, '')
        });
        customCancel();
        renderCustomOptions();
    } else {
        _customError.style.display = '';
    }
}

restoreOptions();
form.addEventListener('submit', saveOptions);

var _customFields = document.getElementById('custom-fields');
var _customAdd = document.getElementById('custom-add');
var _customCancel = document.getElementById('custom-cancel');
var _customSave = document.getElementById('custom-save');

var _customError = document.getElementById('custom-error');


var _customTitle = document.getElementById('custom-title');
var _customLink = document.getElementById('custom-link');

_customAdd.addEventListener('click', customAdd);
_customCancel.addEventListener('click', customCancel);
_customSave.addEventListener('click', customSave);