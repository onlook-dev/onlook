import { ipcRenderer } from 'electron';

const eventHandlerMap: { [key: string]: (e: any) => Object } = {
    'mouseover': (e: MouseEvent) => {
        return {
            el: e.target
        }
    },
    'wheel': (e: WheelEvent) => {
        return {
            coordinates: { x: e.deltaX, y: e.deltaY },
            innerHeight: document.body.scrollHeight,
            innerWidth: window.innerWidth,
        }
    },
    'scroll': (e: Event) => {
        return {
            coordinates: { x: window.scrollX, y: window.scrollY },
            innerHeight: document.body.scrollHeight,
            innerWidth: window.innerWidth,
        }
    },
    'dom-ready': () => {
        const { body } = document;
        const html = document.documentElement;

        const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        );

        return {
            coordinates: { x: 0, y: 0 },
            innerHeight: height,
            innerWidth: window.innerWidth,
        }
    }
}

function handleBodyReady() {
    Object.entries(eventHandlerMap).forEach(([key, handler]) => {
        document.body.addEventListener(key, (e) => {
            const data = handler(e);
            ipcRenderer.sendToHost(key, data);
        });
    })
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