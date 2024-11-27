import type { ActionLocation } from '@onlook/models/actions';
import { WebviewChannels } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { getDomElementByDomId } from '../elements';
import { getDomElement } from '../elements/helpers';
import { elementFromDomId } from '/common/helpers';

export function publishStyleUpdate(domId: string) {
    const domEl = getDomElementByDomId(domId, true);
    if (!domEl) {
        console.error('No domEl found for style update event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, { domEl });
}

export function publishInsertElement(
    location: ActionLocation,
    domEl: DomElement,
    editText: boolean,
) {
    const parent = elementFromDomId(location.targetDomId);
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;
    if (!domEl || !layerMap) {
        console.error('No domEl or layerMap found for insert element event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_INSERTED, { domEl, layerMap, editText });
}

export function publishRemoveElement(location: ActionLocation) {
    const parent = elementFromDomId(location.targetDomId);
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;
    const parentDomEl = parent ? getDomElement(parent as HTMLElement, true) : null;

    if (!parentDomEl || !layerMap) {
        console.error('No parentDomEl or layerMap found for remove element event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_REMOVED, { parentDomEl, layerMap });
}

export function publishMoveElement(domEl: DomElement) {
    const parent = elementFromDomId(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.error('No domEl or layerMap found for move element event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, { domEl, layerMap });
}

export function publishGroupElement(domEl: DomElement) {
    const parent = elementFromDomId(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.error('No domEl or layerMap found for group element event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_GROUPED, { domEl, layerMap });
}

export function publishUngroupElement(parentEl: DomElement) {
    const parent = elementFromDomId(parentEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!parentEl || !layerMap) {
        console.error('No parentEl or layerMap found for ungroup element event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_UNGROUPED, { parentEl, layerMap });
}

export function publishEditText(domEl: DomElement) {
    const parent = elementFromDomId(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.error('No domEl or layerMap found for edit text event');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.ELEMENT_TEXT_EDITED, { domEl, layerMap });
}
