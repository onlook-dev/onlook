import type { ActionElementLocation } from '@onlook/models/actions';
import { WebviewChannels } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { getDomElementWithDomId } from '../elements';
import { getDomElement } from '../elements/helpers';
import { elementFromDomId, selectorFromDomId } from '/common/helpers';

export function publishStyleUpdate(domId: string) {
    const domEl = getDomElementWithDomId(domId, true);
    if (domEl) {
        ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, { domEl });
    }
}

export function publishInsertElement(
    location: ActionElementLocation,
    domEl: DomElement,
    editText: boolean,
) {
    const parent = elementFromDomId(location.targetDomId);
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;
    if (domEl) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_INSERTED, { domEl, layerMap, editText });
    }
}

export function publishRemoveElement(location: ActionElementLocation) {
    const parent = elementFromDomId(location.targetDomId);
    const layerNode = parent ? buildLayerTree(parent as HTMLElement) : null;
    const parentDomEl = getDomElement(parent as HTMLElement, true);

    if (parentDomEl && layerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_REMOVED, { parentDomEl, layerNode });
    }
}

export function publishMoveElement(domEl: DomElement) {
    const selector = selectorFromDomId(domEl.domId);
    const childEl = document.querySelector(selector) as HTMLElement | null;
    const parent = childEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, { domEl, parentLayerNode });
    }
}

export function publishGroupElement(domEl: DomElement) {
    const selector = selectorFromDomId(domEl.domId);
    const childEl = document.querySelector(selector) as HTMLElement | null;
    const parent = childEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_GROUPED, { domEl, parentLayerNode });
    }
}

export function publishUngroupElement(parentEl: DomElement) {
    const selector = selectorFromDomId(parentEl.domId);
    const parent = document.querySelector(selector) as HTMLElement | null;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (parentEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_UNGROUPED, { parentEl, parentLayerNode });
    }
}

export function publishEditText(domEl: DomElement) {
    const selector = selectorFromDomId(domEl.domId);
    const htmlEl = document.querySelector(selector) as HTMLElement | null;
    const parent = htmlEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_TEXT_EDITED, { domEl, parentLayerNode });
    }
}
