import { getDomElement } from '../helpers';
import { getDisplayDirection, publishMoveEvent } from './helpers';
import { createStub, getCurrentStubIndex, moveStub, removeStub } from './stub';
import { EditorAttributes } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { DomElement } from '/common/models/element';

export function startDrag(selector: string, newUniqueId: string): number {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return -1;
    }
    const originalIndex = Array.from(el.parentElement!.children).indexOf(el);
    prepareElementForDragging(el, originalIndex, newUniqueId);
    createStub(el);
    return originalIndex;
}

export function drag(dx: number, dy: number, x: number, y: number) {
    const el = getDragElement();
    el.style.position = 'fixed';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    moveStub(el, x, y);
}

export function endDrag(): { newSelector: string; newIndex: number } {
    const el = getDragElement();
    const parent = el.parentElement;

    if (!parent) {
        throw new Error('Parent not found');
    }

    const stubIndex = getCurrentStubIndex(parent);
    const elIndex = Array.from(parent.children).indexOf(el);

    if (stubIndex !== -1 && stubIndex !== elIndex) {
        moveElToIndex(el, stubIndex);
    }
    removeStub();

    const afterMoveIndex = Array.from(parent.children).indexOf(el);
    cleanUpElementAfterDragging(el, afterMoveIndex);
    publishMoveEvent(el);

    return { newSelector: getUniqueSelector(el), newIndex: afterMoveIndex };
}

export function moveElement(selector: string, newIndex: number): DomElement | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
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

function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
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

function prepareElementForDragging(el: HTMLElement, originalIndex: number, newUniqueId: string) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
    };

    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING, 'true');

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID) === null) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, newUniqueId);
    }

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) === null) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX, originalIndex.toString());
    }

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION) !== null) {
        const parent = el.parentElement;
        if (parent) {
            const displayDirection = getDisplayDirection(parent);
            el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION, displayDirection);
        }
    }
}

function getDragElement(): HTMLElement {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_DRAGGING}]`,
    ) as HTMLElement | null;
    if (!el) {
        throw new Error('Element not found');
    }
    return el;
}

function cleanUpElementAfterDragging(el: HTMLElement, newIndex: number) {
    restoreElementStyle(el);
    removeDragAttributes(el);
    saveElementIndex(el, newIndex);
}

function removeDragAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
}

function restoreElementStyle(el: HTMLElement) {
    try {
        const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
        if (saved) {
            const style = JSON.parse(saved);
            for (const key in style) {
                el.style[key as any] = style[key];
            }
        }
    } catch (e) {
        console.error('Error restoring style', e);
    }
}

function saveElementIndex(el: HTMLElement, newIndex: number) {
    const originalIndex = parseInt(
        el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) || '-1',
        10,
    );
    if (originalIndex !== newIndex) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_NEW_INDEX, newIndex.toString());
    } else {
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX);
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_NEW_INDEX);
    }
}
