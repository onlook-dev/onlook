import type { DomElement } from '@onlook/models/element';
import { getDomElement } from '../helpers';
import { elementFromDomId, isValidHtmlElement } from '/common/helpers';

export function moveElement(
    domId: string,
    newIndex: number,
    targetDomId: string,
    oldParentDomId?: string,
): DomElement | undefined {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Move element not found: ${domId}`);
        return;
    }
    const movedEl = moveElToIndex(el, newIndex, targetDomId, oldParentDomId);
    if (!movedEl) {
        console.warn(`Failed to move element: ${domId}`);
        return;
    }

    const domEl = getDomElement(movedEl, true);
    return domEl;
}

export function getElementIndex(domId: string): number {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Element not found: ${domId}`);
        return -1;
    }

    const htmlElments = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
    const index = htmlElments.indexOf(el);
    return index;
}

export function moveElToIndex(
    el: HTMLElement,
    newIndex: number,
    targetDomId: string,
    oldParentDomId?: string,
): HTMLElement | undefined {
    const targetEl = elementFromDomId(targetDomId) as HTMLElement | null;
    if (!targetEl) {
        console.warn(`Target element not found: ${targetDomId}`);
        return;
    }

    const oldParentEl = oldParentDomId
        ? (elementFromDomId(oldParentDomId) as HTMLElement | null)
        : null;

    if (oldParentEl) {
        oldParentEl.removeChild(el);
    } else {
        el.parentElement?.removeChild(el);
    }

    if (newIndex >= targetEl.children.length) {
        targetEl.appendChild(el);
        return el;
    }

    const referenceNode = targetEl.children[newIndex];
    targetEl.insertBefore(el, referenceNode);
    return el;
}
