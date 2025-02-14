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
        console.warn('Element not found for domId:', domId);
        return;
    }

    const location = getElementLocation(el);
    if (!location) {
        console.warn('Failed to get location for element:', el);
        return;
    }

    const actionEl = getActionElement(el);
    if (!actionEl) {
        console.warn('Failed to get action element for element:', el);
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
