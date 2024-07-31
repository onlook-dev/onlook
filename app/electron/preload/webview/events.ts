import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { WebviewChannels } from '/common/constants';

export function listenForEvents() {
    listenForWindowEvents();
    listenForStyleEvents();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        ipcRenderer.sendToHost('resize');
    });
}

function listenForStyleEvents() {
    const change = new CssStyleChange();

    ipcRenderer.on(WebviewChannels.UPDATE_STYLE, (_, data) => {
        const { selector, style, value } = data;
        change.updateStyle(selector, style, value);
        ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, selector);
    });

    ipcRenderer.on(WebviewChannels.CLEAR_STYLE_SHEET, () => {
        change.clearStyleSheet();
    });
}
