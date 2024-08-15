import { CssStyleChange } from '../changes';
import { getDeepElement, getDomElement } from './helpers';
import { ElementLocation, ElementObject } from '/common/actions';
import { getUniqueSelector } from '/common/helpers';

export function findInsertLocation(x: number, y: number): ElementLocation | undefined {
    const el = getDeepElement(x, y) as HTMLElement | undefined;
    if (!el) {
        return;
    }
    const targetSelector = getUniqueSelector(el);
    const location: ElementLocation = {
        position: 'append',
        targetSelector: targetSelector,
    };
    return location;
}

export function insertElement(
    element: ElementObject,
    location: ElementLocation,
    style: Record<string, string>,
) {
    const targetEl = document.querySelector(location.targetSelector);
    const newEl = document.createElement(element.tagName);

    if (location.position === 'append') {
        targetEl?.appendChild(newEl);
    } else if (location.position === 'prepend') {
        targetEl?.prepend(newEl);
    } else if (location.position === 'before') {
        targetEl?.before(newEl);
    } else if (location.position === 'after') {
        targetEl?.after(newEl);
    } else if (typeof location.position === 'number') {
        // Insert at index
        const children = targetEl?.children;
        if (children && children.length > location.position) {
            targetEl?.insertBefore(newEl, children[location.position]);
        } else {
            targetEl?.appendChild(newEl);
        }
    }

    const domEl = getDomElement(newEl, true);
    const change = new CssStyleChange();

    for (const [key, value] of Object.entries(style)) {
        change.updateStyle(domEl.selector, key, value);
    }
    return domEl;
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
