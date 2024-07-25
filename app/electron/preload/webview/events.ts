import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { getElement, getElementAtLoc } from './elements';
import { WebviewChannels } from '/common/constants';
import { DomElement } from '/common/models/element';

export function listenForEvents() {
    listenForWindowEvents();
    listenForStyleEvents();
    listenForElementEvents();
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

function listenForElementEvents() {
    ipcRenderer.on(WebviewChannels.MOUSE_MOVE, (_, { x, y }) => {
        const domElements: DomElement = getElementAtLoc(x, y);
        const data = JSON.stringify([domElements]);
        if (!data) {
            return;
        }
        ipcRenderer.sendToHost('mouseover', data);
    });

    ipcRenderer.on(WebviewChannels.MOUSE_DOWN, (_, { x, y }) => {
        const domElement: DomElement = getElementAtLoc(x, y);
        const data = JSON.stringify([domElement]);
        if (!data) {
            return;
        }
        ipcRenderer.sendToHost('click', data);
    });

    ipcRenderer.on(WebviewChannels.MOUSE_OVER_ELEMENT, (_, { selector }) => {
        const domElement = getElement(selector);
        const data = JSON.stringify([domElement]);
        if (!data) {
            return;
        }
        ipcRenderer.sendToHost('mouseover', data);
    });

    ipcRenderer.on(WebviewChannels.CLICK_ELEMENT, (_, { selector }) => {
        const domElement: DomElement = getElement(selector);
        const data = JSON.stringify([domElement]);
        if (!data) {
            return;
        }
        ipcRenderer.sendToHost('click', data);
    });
}
