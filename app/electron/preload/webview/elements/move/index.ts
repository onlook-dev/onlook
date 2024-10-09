import { getDomElement } from '../helpers';
import { moveElToIndex } from './helpers';
import { EditorAttributes } from '/common/constants';
import { isValidHtmlElement } from '/common/helpers';
import { DomElement } from '/common/models/element';

export function moveElement(selector: string, newIndex: number): DomElement | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Move element not found: ${selector}`);
        return;
    }
    const originalIndex = getElementIndex(selector);
    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) === null) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX, originalIndex.toString());
    }
    const movedEl = moveElToIndex(el, newIndex);
    if (!movedEl) {
        console.error(`Failed to move element: ${selector}`);
        return;
    }
    const domEl = getDomElement(movedEl, true);
    return domEl;
}

export function clearMovedElements() {
    const movedEls = document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX}]`);
    for (const el of movedEls) {
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX);
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_NEW_INDEX);
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_TIMESTAMP);
    }
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
