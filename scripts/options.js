var customResources = [];

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
        }(),
        customResources: customResources
    }, function() {
        document.getElementById('status').style.opacity = 1;
        setTimeout(function() {
            document.getElementById('status').style.opacity = 0;
        }, 1300);
    });
}

function restoreOptions() {
    app.getOptions(function(options) {
        form.elements['notification'].checked = options.notification;
        form.elements['badge'].checked = options.badge;
        form.elements['rate'].checked = options.rate;

        customResources = options.customResources;

        renderOptions();
        renderCustomOptions();


    });
}

function fillOptionsValue() {
    for (var i in form.elements['resources']) {
        var res = form.elements['resources'][i];
        res.checked = app.options.resources.indexOf(res.value) >= 0;
    }
}

function renderOptions() {
    var optionsPattern = document.getElementById('options-list-tmp').innerHTML;
    var optionsList = document.getElementById('options');
    optionsList.innerHTML = '';

    $resources.forEach(function(item) {
        var elementLi = document.createElement('li');
        elementLi.innerHTML = app.fillPattern(optionsPattern, item);
        optionsList.appendChild(elementLi);
    });
    fillOptionsValue();
}

function renderCustomOptions() {
    var customOptionsPattern = document.getElementById('custom-options-list-tmp').innerHTML;
    var customOptionsList = document.getElementById('custom-options');
    customOptionsList.innerHTML = '';

    customResources.forEach(function(item) {
        var elementLi = document.createElement('li');
        elementLi.innerHTML = app.fillPattern(customOptionsPattern, item);
        elementLi.querySelector('.custom-delete').addEventListener('click', function() {
            customRemove(item.id);
        });

        customOptionsList.appendChild(elementLi);
    });

    fillOptionsValue();
}

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
    var domain = _customLink.value.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im)

    if (_customTitle.value && _customLink.value) {
        customResources.push({
            title: _customTitle.value,
            link: _customLink.value,
            id: 'ctm_' + _customTitle.value.toLowerCase().replace(/[^\w]/g, ''),
            domain: domain[1] ? domain[1] : ''
        });
        customCancel();
        renderCustomOptions();
    } else {
        _customError.style.display = '';
    }
}

function customRemove(id) {
    for (var i = 0; i < customResources.length; i++) {
        if (customResources[i].id === id) {
            customResources.splice(i, 1);
            break;
        }
    }
    renderCustomOptions();
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