import { getInsertedElement } from './insert';
import { InsertedElement } from '/common/models/actions/dom';

export function copyElementBySelector(selector: string): InsertedElement | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const clonedEl = getInsertedElement(el);
    return clonedEl;
}
