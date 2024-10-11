import { getActionElement } from './helpers';
import { EditorAttributes } from '/common/constants';
import { ActionElement } from '/common/models/actions';

export function copyElementBySelector(selector: string): ActionElement | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const cloned = el.cloneNode(true) as HTMLElement;
    return getActionElement(cleanClonedElement(cloned));
}

function cleanClonedElement(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_ID);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID);
    return el;
}
