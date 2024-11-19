import type { RemoveElementAction } from '@onlook/models/actions';
import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';

export function getRemoveActionFromSelector(
    selector: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error('Element not found for selector:', selector);
        return;
    }

    const location = getElementLocation(el);
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
    };
}
