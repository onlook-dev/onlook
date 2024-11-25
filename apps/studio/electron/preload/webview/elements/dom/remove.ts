import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';
import { EditorAttributes } from '@onlook/models/constants';
import type { RemoveElementAction } from '@onlook/models/actions';

export function getRemoveActionFromSelector(
    selector: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error('Element not found for selector:', selector);
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
