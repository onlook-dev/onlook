import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';
import { EditorAttributes } from '/common/constants';
import { RemoveElementAction } from '/common/models/actions';

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
    const uuid = el.getAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID);
    if (!uuid) {
        console.error('Element has no unique id:', selector);
        return;
    }

    return {
        type: 'remove-element',
        targets: [
            {
                webviewId,
                uuid,
                selector,
            },
        ],
        location: location,
        element: actionEl,
    };
}
