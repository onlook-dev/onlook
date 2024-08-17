import { CssStyleChange } from '../changes';
import { getDeepElement, getDomElement } from './helpers';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { getUniqueSelector } from '/common/helpers';
import { DomElement } from '/common/models/element';

export function getInsertLocation(x: number, y: number): ActionElementLocation | undefined {
    const el = getDeepElement(x, y) as HTMLElement | undefined;
    if (!el) {
        return;
    }
    const targetSelector = getUniqueSelector(el);
    const location: ActionElementLocation = {
        position: 'append',
        targetSelector: targetSelector,
    };
    return location;
}

export function insertElement(
    element: ActionElement,
    location: ActionElementLocation,
    style: Record<string, string>,
): DomElement | undefined {
    const targetEl = document.querySelector(location.targetSelector);
    if (!targetEl) {
        console.error(`Target element not found: ${location.targetSelector}`);
        return;
    }

    const newEl = document.createElement(element.tagName);

    switch (location.position) {
        case 'append':
            targetEl.appendChild(newEl);
            break;
        case 'prepend':
            targetEl.prepend(newEl);
            break;
        case 'before':
            targetEl.before(newEl);
            break;
        case 'after':
            targetEl.after(newEl);
            break;
        default:
            console.error(`Invalid position: ${location.position}`);
            return;
    }

    const change = new CssStyleChange();
    const selector = getUniqueSelector(newEl);
    for (const [key, value] of Object.entries(style)) {
        change.updateStyle(selector, key, value);
    }

    const domEl = getDomElement(newEl, true);
    return domEl;
}

export function removeElement(location: ActionElementLocation): HTMLElement | null {
    const targetEl = document.querySelector(location.targetSelector) as HTMLElement | null;

    if (!targetEl) {
        console.error(`Target element not found: ${location.targetSelector}`);
        return null;
    }

    let elementToRemove: HTMLElement | null = null;

    switch (location.position) {
        case 'append':
            elementToRemove = targetEl.lastElementChild as HTMLElement | null;
            break;
        case 'prepend':
            elementToRemove = targetEl.firstElementChild as HTMLElement | null;
            break;
        case 'before':
            elementToRemove = targetEl.previousElementSibling as HTMLElement | null;
            break;
        case 'after':
            elementToRemove = targetEl.nextElementSibling as HTMLElement | null;
            break;
        default:
            console.error(`Invalid position: ${location.position}`);
            return null;
    }

    if (elementToRemove) {
        elementToRemove.remove();
        return elementToRemove;
    } else {
        console.warn(`No element found to remove at the specified location`);
        return null;
    }
}

export function insertTextElement(
    x: number,
    y: number,
    width: number,
    height: number,
    content: string = 'Lorem Ipsum',
) {
    const el = getDeepElement(x, y) as HTMLElement | undefined;
    if (!el) {
        return;
    }
    const newP = document.createElement('p');
    newP.textContent = content;
    el.appendChild(newP);

    const domEl = getDomElement(newP, false);
    const change = new CssStyleChange();
    change.updateStyle(domEl.selector, 'width', `${width}px`);
    change.updateStyle(domEl.selector, 'height', `${height}px`);
    return domEl;
}
