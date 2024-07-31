import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { getElement } from './elements';
import { WebviewChannels } from '/common/constants';
import { DomElement } from '/common/models/element';

export function listenForEvents() {
    console.log('listening for events');
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
    ipcRenderer.on(WebviewChannels.MOUSE_MOVE, (_, { x, y, scope }) => {
        console.log('scope', scope);

        // const domElements: DomElement = getElementAtLoc(x, y, scope);
        // const data = JSON.stringify([domElements]);
        // if (!data) {
        //     return;
        // }
        // ipcRenderer.sendToHost('mouseover', data);
    });

    ipcRenderer.on(WebviewChannels.MOUSE_DOWN, (_, { x, y, scope }) => {
        console.log('scope', scope);
        // const domElement: DomElement = getElementAtLoc(x, y, scope);
        // const data = JSON.stringify([domElement]);
        // if (!data) {
        //     return;
        // }
        // ipcRenderer.sendToHost('click', data);
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
