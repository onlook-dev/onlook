import { processDom } from './dom.ts';
import { listenForDomChanges } from './events/index.ts';
import { cssManager } from './style/css-manager.ts';

export function handleBodyReady() {
    listenForDomChanges();    
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
            if (processDom() !== null) {
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
