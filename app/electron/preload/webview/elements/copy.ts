import { getInsertedElement } from './insert';
import { DomInsert } from '/common/models/actions/dom';

export function copyElementBySelector(selector: string): DomInsert | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const clonedEl = getInsertedElement(el);
    return clonedEl;
}
