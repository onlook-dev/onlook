import { setApi } from './api';
import { processDom } from './dom';
import { listenForEvents } from './events';
import cssManager from './style';

function handleBodyReady() {
    setApi();
    listenForEvents();
    keepDomUpdated();
    cssManager.injectDefaultStyles();
}

function keepDomUpdated() {
    const interval = setInterval(() => {
        if (processDom()) {
            clearInterval(interval);
        }
    }, 5000);
}

const handleDocumentBody = setInterval(() => {
    window.onerror = function logError(errorMsg, url, lineNumber) {
        console.log(`Unhandled error: ${errorMsg} ${url} ${lineNumber}`);
    };

    if (window?.document?.body) {
        clearInterval(handleDocumentBody);
        try {
            handleBodyReady();
        } catch (err) {
            console.log('Error in documentBodyInit:', err);
        }
    }
}, 300);
