import { getDomElement } from '../helpers';
import { moveElToIndex } from './helpers';
import { EditorAttributes } from '/common/constants';
import { getUniqueSelector, isValidHtmlElement } from '/common/helpers';
import { InsertPos } from '/common/models';
import { DomElement } from '/common/models/element';
import { ActionMoveLocation, DomActionType, MovedElement } from '/common/models/element/domAction';

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

export function getMovedElements(): MovedElement[] {
    const movedEls = Array.from(
        document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX}]`),
    )
        .filter((el) => {
            const parent = el.parentElement;
            const isParentInserted =
                parent && parent.hasAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);
            const isElementInserted = el.hasAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);
            return !isParentInserted && !isElementInserted;
        })
        .filter((el) => {
            const originalIndex = el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX);
            const currentIndex = getElementIndex(getUniqueSelector(el as HTMLElement));
            return originalIndex !== currentIndex.toString();
        })
        .map((el) => getMovedElement(el as HTMLElement))
        .sort((a, b) => a.timestamp - b.timestamp);
    return movedEls;
}

function getMovedElement(el: HTMLElement): MovedElement {
    return {
        type: DomActionType.MOVE,
        selector: getUniqueSelector(el),
        timestamp: parseInt(el.getAttribute(EditorAttributes.DATA_ONLOOK_TIMESTAMP) || '0'),
        location: getMovedLocation(el),
    };
}

function getMovedLocation(el: HTMLElement): ActionMoveLocation {
    const parent = el.parentElement;
    if (!parent) {
        throw new Error('Inserted element has no parent');
    }
    const index: number | undefined = Array.from(parent.children).indexOf(el);
    const position = InsertPos.INDEX;

    return {
        targetSelector: getUniqueSelector(parent),
        position,
        index,
    };
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
