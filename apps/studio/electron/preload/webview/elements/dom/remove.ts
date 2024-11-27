import type { RemoveElementAction } from '@onlook/models/actions';
import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';
import { elementFromDomId } from '/common/helpers';

export function getRemoveActionFromDomId(
    domId: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Element not found for domId:', domId);
        return;
    }

    const parent = el.parentElement;
    if (!parent) {
        console.error('Parent element not found for:', selector);
        return;
    }

    const location = {
        ...getElementLocation(el)!,
        staticIndex: getElementStaticIndex(parent, el),
    };

    if (!location) {
        console.error('Failed to get location for element:', el);
        return;
    }

    const actionEl = getActionElement(el);
    if (!actionEl) {
        console.error('Failed to get action element for element:', el);
        return;
    }

    return {
        type: 'remove-element',
        targets: [
            {
                webviewId,
                domId: actionEl.domId,
                oid: actionEl.oid,
            },
        ],
        location: location,
        element: actionEl,
        editText: false,
        pasteParams: null,
    };
}

function getElementStaticIndex(parent: Element, element: Element): number {
    const children = Array.from(parent.children);

    const index = children.indexOf(element);

    //determines position occurrence
    const staticIndex =
        children
            .slice(0, index + 1)
            .filter((el) => !el.hasAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE)).length - 1;

    return staticIndex;
}
