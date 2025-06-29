import type { ActionLocation, DomElement } from '@onlook/models';
import { getHtmlElement } from '../../helpers';
import { buildLayerTree } from '../dom';
import { getElementByDomId } from '../elements';
import { getDomElement } from '../elements/helpers';
import { penpalParent } from '../../index';
import { FrameViewEvents } from '@onlook/constants';

export function publishStyleUpdate(domId: string) {
    const domEl = getElementByDomId(domId, true);
    if (!domEl) {
        console.warn('No domEl found for style update event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.UPDATE_STYLE,
        args: { domEl }
    });
}

export function publishInsertElement(
    location: ActionLocation,
    domEl: DomElement,
    editText: boolean,
) {
    const parent = getHtmlElement(location.targetDomId);
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;
    if (!domEl || !layerMap) {
        console.warn('No domEl or layerMap found for insert element event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.INSERT_ELEMENT,
        args: { domEl, layerMap, editText }
    });
}

export function publishRemoveElement(location: ActionLocation) {
    const parent = getHtmlElement(location.targetDomId);
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;
    const parentDomEl = parent ? getDomElement(parent as HTMLElement, true) : null;

    if (!parentDomEl || !layerMap) {
        console.warn('No parentDomEl or layerMap found for remove element event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.REMOVE_ELEMENT,
        args: { parentDomEl, layerMap }
    });
}

export function publishMoveElement(domEl: DomElement) {
    const parent = getHtmlElement(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.warn('No domEl or layerMap found for move element event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.MOVE_ELEMENT,
        args: { domEl, layerMap }
    });
}

export function publishGroupElement(domEl: DomElement) {
    console.log('publishGroupElement', domEl);
    const parent = getHtmlElement(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.warn('No domEl or layerMap found for group element event');
        return;
    }

    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.GROUP_ELEMENTS,
        args: { domEl, layerMap }
    });
}

export function publishUngroupElement(parentEl: DomElement) {
    const parent = getHtmlElement(parentEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!parentEl || !layerMap) {
        console.warn('No parentEl or layerMap found for ungroup element event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.UNGROUP_ELEMENTS,
        args: { parentEl, layerMap }
    });
}

export function publishEditText(domEl: DomElement) {
    const parent = getHtmlElement(domEl.domId)?.parentElement;
    const layerMap = parent ? buildLayerTree(parent as HTMLElement) : null;

    if (!domEl || !layerMap) {
        console.warn('No domEl or layerMap found for edit text event');
        return;
    }
    penpalParent?.handleFrameViewEvent({
        action: FrameViewEvents.EDIT_ELEMENT_TEXT,
        args: { domEl, layerMap }
    });
}
