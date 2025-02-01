import { WebviewChannels } from '@onlook/models/constants';
import { setApi, type TOnlookWindow } from './api';
import { processDom } from './dom';
import { listenForEvents } from './events';
import cssManager from './style';

// Initialize API immediately
setApi();

// Now we can safely add the message handler
(window as TOnlookWindow).onlook.bridge.receive((event) => {
    if (event.data.type === WebviewChannels.EXECUTE_CODE) {
        const { code, messageId } = event.data;
        const [port] = event.ports;

        try {
            const result = eval(code);
            port.postMessage({ result, messageId });
        } catch (error) {
            port.postMessage({
                error: error instanceof Error ? error.message : 'Unknown error',
                messageId,
            });
        }
    }
});

function handleBodyReady() {
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
            console.error('Error in keepDomUpdated:', err);
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
