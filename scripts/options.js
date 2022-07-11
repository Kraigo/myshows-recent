var customResources = [];

function init() {
    app.setLocalization(document.body);
    app.setLocalizationDomain(document.body);
    restoreOptions();
}

function saveOptions(e) {
    e.preventDefault();
    customCancel();
    var options = {
        notification: form.elements['notification'].checked,
        rate: form.elements['rate'].checked,
        pin: form.elements['pin'].checked,
        context: form.elements['context'].checked,
        language: getRadioListValue(form.elements['language']),
        resources: function() {
            var resources = [];
            for (var i = 0; i < form.elements['resources'].length; i++) {
                var res = form.elements['resources'][i];
                if (res.checked) {
                    resources.push(res.value);
                }
            }
            return resources;
        }(),
        customResources: customResources,
        showOnBadge: getRadioListValue(form.elements['showOnBadge']),
        badgeColor: form.elements['badgeColorEnabled'].checked
            ? form.elements['badgeColor'].value
            : null
    };
    
    app.setOptions(options, function() {
        app.removeContextMenu();
        app.updateUnwatchedBadge();
        
        if (options.context) {
            app.setContextMenu();
        }

        document.getElementById('status').style.opacity = 1;
        setTimeout(function() {
            document.getElementById('status').style.opacity = 0;
        }, 1300);
    });
}

function restoreOptions() {
    app.getOptions(function(options) {
        form.elements['notification'].checked = options.notification;
        form.elements['rate'].checked = options.rate;
        form.elements['pin'].checked = options.pin;
        form.elements['context'].checked = options.context;
        setRadioListValue(form.elements['language'], options.language);
        setRadioListValue(form.elements['showOnBadge'], options.showOnBadge);
        form.elements['badgeColorEnabled'].checked = options.badgeColor;
        form.elements['badgeColorEnabled'].dispatchEvent(new Event('change'));
        form.elements['badgeColor'].value = options.badgeColor || '#3367d6';

        customResources = options.customResources;

        renderOptions();
        renderCustomOptions();
    });
}

function fillOptionsValue() {
    for (var i = 0, res; i < form.elements['resources'].length; i++) {
        res = form.elements['resources'][i];
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

function getRadioListValue(collection) {
    return Array.prototype.find.call(collection, function(elm) {
        return elm.checked;
    }).value;
}

function setRadioListValue(collection, value) {
    Array.prototype.forEach.call(collection, function(elm) {
        if (elm.value === value) {
            elm.checked = true;
        }
    });
}

function toggleBadgeColorPicker(e) {
    _badgeColorPicker.style.display = e.target.checked ? 'block' : 'none';
}

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


var _badgeColorCustom = document.querySelector('input[name=badgeColorEnabled]');
var _badgeColorPicker = document.getElementById('badgeColorPicker');
_badgeColorCustom.addEventListener('change', toggleBadgeColorPicker);


document.addEventListener("DOMContentLoaded", function() {
    app.initialize(init);
});