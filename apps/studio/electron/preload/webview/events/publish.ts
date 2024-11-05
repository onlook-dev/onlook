import type { ActionElementLocation } from '@onlook/models/actions';
import { WebviewChannels } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { getDomElement } from '../elements/helpers';

export function publishStyleUpdate(selector: string) {
    const el = document.querySelector(selector);
    const domEl = getDomElement(el as HTMLElement, true);

    if (domEl) {
        ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, { domEl });
    }
}

export function publishInsertElement(
    location: ActionElementLocation,
    domEl: DomElement,
    editText: boolean,
) {
    const parent = document.querySelector(location.targetSelector);
    const layerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && layerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_INSERTED, { domEl, layerNode, editText });
    }
}

export function publishRemoveElement(location: ActionElementLocation) {
    const parent = document.querySelector(location.targetSelector);
    const layerNode = parent ? buildLayerTree(parent as HTMLElement) : null;
    const parentDomEl = getDomElement(parent as HTMLElement, true);

    if (parentDomEl && layerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_REMOVED, { parentDomEl, layerNode });
    }
}

export function publishMoveElement(domEl: DomElement) {
    const childEl = document.querySelector(domEl.selector) as HTMLElement | null;
    const parent = childEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, { domEl, parentLayerNode });
    }
}

export function publishGroupElement(domEl: DomElement) {
    const childEl = document.querySelector(domEl.selector) as HTMLElement | null;
    const parent = childEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_GROUPED, { domEl, parentLayerNode });
    }
}

export function publishUngroupElement(parentEl: DomElement) {
    const parent = document.querySelector(parentEl.selector) as HTMLElement | null;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (parentEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_UNGROUPED, { parentEl, parentLayerNode });
    }
}

export function publishEditText(domEl: DomElement) {
    const htmlEl = document.querySelector(domEl.selector) as HTMLElement | null;
    const parent = htmlEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_TEXT_EDITED, { domEl, parentLayerNode });
    }
}
