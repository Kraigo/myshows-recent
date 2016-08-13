console.log('I\'m connected');

chrome.runtime.sendMessage(null, 'Hi background from fsplayer');

window.addEventListener("message", function(e){
    switch (e.data.fsCommand) {
        case "aplayerPause": {
            console.log('pausedVideo');
            break;
        }
        default: {
            console.log('e.data.fsCommand: ' + e.data.fsCommand);
        }
    }
}, false);