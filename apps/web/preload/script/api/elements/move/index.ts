import type { DomElement } from '@onlook/models';
import { getHtmlElement, isValidHtmlElement } from '../../../helpers';
import { getDomElement } from '../helpers';

export function moveElement(domId: string, newIndex: number): DomElement | null {
    const el = getHtmlElement(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Move element not found: ${domId}`);
        return null;
    }

    const movedEl = moveElToIndex(el, newIndex);
    if (!movedEl) {
        console.warn(`Failed to move element: ${domId}`);
        return null;
    }

    const domEl = getDomElement(movedEl, true);
    return domEl;
}

export function getElementIndex(domId: string): number {
    const el = getHtmlElement(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Element not found: ${domId}`);
        return -1;
    }

    const htmlElments = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
    const index = htmlElments.indexOf(el);
    return index;
}

export function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
        console.warn('Parent not found');
        return;
    }

    parent.removeChild(el);
    if (newIndex >= parent.children.length) {
        parent.appendChild(el);
        return el;
    }

    const referenceNode = parent.children[newIndex];
    parent.insertBefore(el, referenceNode ?? null);
    return el;
}
