import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { getElementsMetadataFromMouseEvent, getElementsMetadataFromSelector } from './elements';
import { WebviewChannels } from '/common/constants';

export class EventBridge {
    constructor() {}

    init() {
        this.forwardEventsToHost();
        this.listenForHostEvents();
    }

    forwardEventsToHost() {
        window.addEventListener('resize', () => {
            ipcRenderer.sendToHost('resize');
        });
    }

    listenForHostEvents() {
        const change = new CssStyleChange();

        ipcRenderer.on(WebviewChannels.UPDATE_STYLE, (_, data) => {
            const { selector, style, value } = data;
            change.updateStyle(selector, style, value);
            ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, selector);
        });

        ipcRenderer.on(WebviewChannels.CLEAR_STYLE_SHEET, () => {
            change.clearStyleSheet();
        });

        ipcRenderer.on(WebviewChannels.MOUSE_MOVE, (_, { x, y }) => {
            const metadata = getElementsMetadataFromMouseEvent(x, y);
            const data = JSON.stringify(metadata);
            if (!data) {
                return;
            }
            ipcRenderer.sendToHost('mouseover', data);
        });

        ipcRenderer.on(WebviewChannels.MOUSE_DOWN, (_, { x, y }) => {
            const metadata = getElementsMetadataFromMouseEvent(x, y, true);
            const data = JSON.stringify(metadata);
            if (!data) {
                return;
            }
            ipcRenderer.sendToHost('click', data);
        });

        ipcRenderer.on(WebviewChannels.MOUSE_OVER_ELEMENT, (_, { selector }) => {
            const metadata = getElementsMetadataFromSelector(selector);
            const data = JSON.stringify(metadata);
            if (!data) {
                return;
            }
            ipcRenderer.sendToHost('mouseover', data);
        });

        ipcRenderer.on(WebviewChannels.CLICK_ELEMENT, (_, { selector }) => {
            const metadata = getElementsMetadataFromSelector(selector, true);
            const data = JSON.stringify(metadata);
            if (!data) {
                return;
            }
            ipcRenderer.sendToHost('click', data);
        });
    }
}
