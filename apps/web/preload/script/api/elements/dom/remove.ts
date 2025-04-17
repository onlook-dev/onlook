import type { RemoveElementAction } from '@onlook/models/actions';
import { getHtmlElement } from '../../../helpers';
import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';

export function getRemoveAction(
    domId: string,
    frameId: string,
): RemoveElementAction | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Element not found for domId:', domId);
        return null;
    }

    const location = getElementLocation(el);
    if (!location) {
        console.warn('Failed to get location for element:', el);
        return null;
    }

    const actionEl = getActionElement(domId);
    if (!actionEl) {
        console.warn('Failed to get action element for element:', el);
        return null;
    }

    return {
        type: 'remove-element',
        targets: [
            {
                frameId,
                domId: actionEl.domId,
                oid: actionEl.oid,
            },
        ],
        location: location,
        element: actionEl,
        editText: false,
        pasteParams: null,
        codeBlock: null,
    };
}
