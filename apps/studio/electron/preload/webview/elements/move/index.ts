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

    const htmlElements = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
    console.log('getElementIndex:', {
        domId,
        totalChildren: el.parentElement?.children.length,
        validChildren: htmlElements.length,
        currentIndex: htmlElements.indexOf(el),
    });
    return htmlElements.indexOf(el);
}

export function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
        console.error('Parent not found');
        return;
    }

    const validChildren = Array.from(parent.children).filter(isValidHtmlElement);
    const referenceNode = validChildren[newIndex];

    parent.removeChild(el);
    if (!referenceNode) {
        parent.appendChild(el);
        return el;
    }

    parent.insertBefore(el, referenceNode);
    return el;
}
