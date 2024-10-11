import { ipcRenderer } from 'electron';
import { ActionElementLocation } from '../../../../common/models/actions';
import { buildLayerTree } from '../dom';
import { getDomElement } from '../elements/helpers';
import { WebviewChannels } from '/common/constants';
import { DomElement } from '/common/models/element';

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
    const htmlEl = document.querySelector(domEl.selector) as HTMLElement | null;
    const parent = htmlEl?.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, { domEl, parentLayerNode });
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
