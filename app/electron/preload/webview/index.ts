import { setApi } from './api';
import { processDom } from './dom';
import { listenForEvents } from './events';

function handleBodyReady() {
    keepDomUpdated();
    setApi();
    listenForEvents();
    injectTailwindCDN();
}

function injectTailwindCDN() {
    const head = document.head;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.15/dist/tailwind.min.css';
    head.appendChild(link);
}

function keepDomUpdated() {
    processDom();
    setInterval(() => processDom(), 5000);
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
