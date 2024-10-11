import { getActionElement } from './helpers';
import { ActionElement } from '/common/models/actions';

export function copyElementBySelector(selector: string): ActionElement | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const clonedEl = getActionElement(el);
    return clonedEl;
}
