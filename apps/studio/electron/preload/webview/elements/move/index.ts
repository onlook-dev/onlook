import type { DomElement } from '@onlook/models/element';
import { getDomElement } from '../helpers';
import { elementFromDomId, isValidHtmlElement } from '/common/helpers';

export function moveElement(domId: string, newIndex: number): DomElement | undefined {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.error(`Move element not found: ${domId}`);
        return;
    }

    const movedEl = moveElToIndex(el, newIndex);
    if (!movedEl) {
        console.error(`Failed to move element: ${domId}`);
        return;
    }

    const domEl = getDomElement(movedEl, true);
    return domEl;
}

export function getElementIndex(domId: string): number {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${domId}`);
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
