var persistent = {
    storage: {},
    value: function (key) {
        return chrome.storage.local.get(key)
            .then(function(result) {
                return result ? result[key] : undefined;
            });
    },
    valueLocal: function (key) {
        return persistent.storage[key];
    },

    update: function (key, data) {
        return chrome.storage.local.set({
            [key]: data
        })
    },
    initialize: function (keys, callback) {
        keys = Array.isArray(keys) ? keys : [keys];

        Promise.all(keys.map(function (key) {
            return chrome.storage.local.get(key);
        })).then(function (result) {
            const storage = result.reduce(function(acc, cur) {
                return Object.assign(acc, cur);
            }, {});
            persistent.storage = storage;

            if (typeof callback === 'function') {
                callback();
            }
        });

        chrome.storage.local.onChanged.addListener(function (changes) {
            var storage = Object.keys(changes)
                .reduce(function (acc, cur) {
                    return Object.assign(acc, { [cur]: changes[cur].newValue })
                }, {});
        
            persistent.storage = Object.assign(persistent.storage, storage);
        });
    }
};
