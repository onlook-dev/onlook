import { listenForDomMutation } from './dom';

export function listenForEvents() {
    listenForWindowEvents();
    listenForDomMutation();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        // ipcRenderer.sendToHost(WebviewChannels.WINDOW_RESIZED);
    });
}
