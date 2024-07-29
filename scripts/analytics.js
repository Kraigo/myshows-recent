const ANALYTICS_PATH = 'https://www.google-analytics.com/mp/collect';
const ANALYTICS_ID = 'G-3BGRH658JQ';
const API_SECRET = 'I1F1GK74Tp61P30zRbE4FQ';
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;

function sendAnalyticEvent(name, params = {}) {
    // Placeholder
}

async function fireEvent(name, params = {}) {
    const clientId = await getUserIdPromise();
    if (!params.session_id) {
        params.session_id = clientId;
    }
    if (!params.engagement_time_msec) {
        params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC;
    }

    try {
        const query = new URLSearchParams({
            measurement_id: ANALYTICS_ID,
            api_secret: API_SECRET,
        })
        const url = `${ANALYTICS_PATH}?${query.toString()}`;
        const event = {
            name,
            params
        };

        const response = await fetch(url,
            {
                method: 'POST',
                body: JSON.stringify({
                    client_id: clientId,
                    events: [event]
                })
            }
        );
    } catch (e) {
        console.error('Google Analytics request failed with an exception', e);
    }
}

function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex;
}

function getUserId(callback) {
    chrome.storage.sync.get(function (options) {
        var userLogin = options.user && options.user.login;
        var tempUserId = options.tempUserId;

        if (userLogin) {
            callback(userLogin);
        }
        else if (tempUserId) {
            callback(tempUserId);
        }
        else {
            tempUserId = getRandomToken();
            chrome.storage.sync.set({ tempUserId: tempUserId }, function () {
                callback(userId);
            });
        }
    });
}

function getUserIdPromise() {
    return new Promise(function (resolve, reject) {
        getUserId(resolve);
    })
}