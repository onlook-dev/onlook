import { ipcRenderer } from 'electron';

const documentBodyInit = () => {
    // Browser Sync
    const bsScript = window.document.createElement('script');
    bsScript.src =
        'https://localhost:12719/browser-sync/browser-sync-client.js?v=2.27.10';
    bsScript.async = true;
    window.document.body.appendChild(bsScript);

    // Context Menu
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        ipcRenderer.send('show-context-menu', {
            contextMenuMeta: { x: e.x, y: e.y },
        });
    });

    window.addEventListener('wheel', (e) => {
        ipcRenderer.sendToHost('pass-scroll-data', {
            coordinates: { x: e.deltaX, y: e.deltaY },
            innerHeight: document.body.scrollHeight,
            innerWidth: window.innerWidth,
        });
    });

    window.addEventListener('dom-ready', () => {
        const { body } = document;
        const html = document.documentElement;

        const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        );

        ipcRenderer.sendToHost('pass-scroll-data', {
            coordinates: { x: 0, y: 0 },
            innerHeight: height,
            innerWidth: window.innerWidth,
        });
    });
};

ipcRenderer.on('context-menu-command', (_, command) => {
    ipcRenderer.sendToHost('context-menu-command', command);
});

const documentBodyWaitHandle = setInterval(() => {
    window.onerror = function logError(errorMsg, url, lineNumber) {
        // eslint-disable-next-line no-console
        console.log(`Unhandled error: ${errorMsg} ${url} ${lineNumber}`);
        // Code to run when an error has occurred on the page
    };

    if (window?.document?.body) {
        clearInterval(documentBodyWaitHandle);
        try {
            documentBodyInit();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log('Error in documentBodyInit:', err);
        }

        return;
    }
    // eslint-disable-next-line no-console
    console.log('document.body not ready');
}, 300);
