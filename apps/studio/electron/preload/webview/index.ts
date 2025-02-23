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

let domUpdateInterval: ReturnType<typeof setInterval> | null = null;

function keepDomUpdated() {
    if (domUpdateInterval !== null) {
        clearInterval(domUpdateInterval);
        domUpdateInterval = null;
    }

    const interval = setInterval(() => {
        try {
            if (processDom()) {
                clearInterval(interval);
                domUpdateInterval = null;
            }
        } catch (err) {
            clearInterval(interval);
            domUpdateInterval = null;
            console.warn('Error in keepDomUpdated:', err);
        }
    }, 5000);

    domUpdateInterval = interval;
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
