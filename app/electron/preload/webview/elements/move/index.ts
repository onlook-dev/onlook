import { getDomElement } from '../helpers';
import { isValidHtmlElement } from '/common/helpers';
import { DomElement } from '/common/models/element';

export function moveElement(selector: string, newIndex: number): DomElement | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;

    if (!el) {
        console.error(`Move element not found: ${selector}`);
        return;
    }

    const movedEl = moveElToIndex(el, newIndex);

    if (!movedEl) {
        console.error(`Failed to move element: ${selector}`);
        return;
    }

    const domEl = getDomElement(movedEl, true);
    return domEl;
}

export function getElementIndex(selector: string): number {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return -1;
    }
    const htmlElments = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
    const index = htmlElments.indexOf(el);
    return index;
}

export function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
        console.error('Parent not found');
        return;
    }
    parent.removeChild(el);
    if (newIndex >= parent.children.length) {
        parent.appendChild(el);
        return el;
    }

    const referenceNode = parent.children[newIndex];
    parent.insertBefore(el, referenceNode);
    return el;
}
