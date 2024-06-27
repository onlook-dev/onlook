import { EventBridge } from "./eventBridge";

function handleBodyReady() {
    const eventBridge = new EventBridge();
    eventBridge.init();
};

const handleDocumentBody = setInterval(() => {
    window.onerror = function logError(errorMsg, url, lineNumber) {
        console.log(`Unhandled error: ${errorMsg} ${url} ${lineNumber}`);
        // Code to run when an error has occurred on the page
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