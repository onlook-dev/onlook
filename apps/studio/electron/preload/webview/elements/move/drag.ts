import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { getOrAssignDomId } from '../../ids';
import { getDomElement, restoreElementStyle } from '../helpers';
import { getDisplayDirection } from './helpers';
import { createStub, getCurrentStubIndex, moveStub, removeStub } from './stub';
import { elementFromDomId, isValidHtmlElement } from '/common/helpers';

export function startDrag(domId: string): number | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn(`Start drag element not found: ${domId}`);
        return null;
    }
    const parent = el.parentElement;
    if (!parent) {
        console.warn('Start drag parent not found');
        return null;
    }
    const htmlChildren = Array.from(parent.children).filter(isValidHtmlElement);
    const originalIndex = htmlChildren.indexOf(el);
    prepareElementForDragging(el);
    createStub(el);
    const pos = getAbsolutePosition(el);
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION, JSON.stringify(pos));
    return originalIndex;
}

export function drag(domId: string, dx: number, dy: number, x: number, y: number) {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn('Dragging element not found');
        return;
    }

    const computedStyle = window.getComputedStyle(el);
    const isAbsolute = computedStyle.position === 'absolute';

    const pos = JSON.parse(
        el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION) || '{}',
    );

    if (isAbsolute) {
        const left = pos.left + dx;
        const top = pos.top + dy;

        el.style.position = 'absolute';
        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
        el.style.width = computedStyle.width + 1;
        el.style.height = computedStyle.height + 1;
    } else {
        const left = pos.left + dx - window.scrollX;
        const top = pos.top + dy - window.scrollY;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = computedStyle.width + 1;
        el.style.height = computedStyle.height + 1;
        el.style.position = 'fixed';
        moveStub(el, x, y);
    }
}

export function endDrag(domId: string): {
    newIndex: number;
    child: DomElement;
    parent: DomElement;
} | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn('End drag element not found');
        endAllDrag();
        return null;
    }

    const parent = el.parentElement;
    if (!parent) {
        console.warn('End drag parent not found');
        cleanUpElementAfterDragging(el);
        return null;
    }

    const computedStyle = window.getComputedStyle(el);
    const isAbsolute = computedStyle.position === 'absolute';

    const newChild = getDomElement(el, true);
    const newParent = getDomElement(parent, false);

    if (isAbsolute) {
        if (!el.style.left || !el.style.top) {
            console.warn('End drag element has no left or top style');
            return null;
        }
        if (newChild.styles?.computed) {
            newChild.styles.computed.position = 'absolute';
            newChild.styles.computed.left = el.style.left;
            newChild.styles.computed.top = el.style.top;
        }
        removeDragAttributes(el);
        getOrAssignDomId(el);
        return {
            newIndex: -1,
            child: newChild,
            parent: newParent,
        };
    } else {
        const stubIndex = getCurrentStubIndex(parent, el);
        cleanUpElementAfterDragging(el);
        removeStub();

        if (stubIndex === -1) {
            return null;
        }

        const elementIndex = Array.from(parent.children).indexOf(el);
        if (stubIndex === elementIndex) {
            return null;
        }

        return {
            newIndex: stubIndex,
            child: newChild,
            parent: newParent,
        };
    }
}

function prepareElementForDragging(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
        width: el.style.width,
        height: el.style.height,
        left: el.style.left,
        top: el.style.top,
    };

    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING, 'true');

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION) !== null) {
        const parent = el.parentElement;
        if (parent) {
            const displayDirection = getDisplayDirection(parent);
            el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION, displayDirection);
        }
    }
}

function getDragElement(): HTMLElement | undefined {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_DRAGGING}]`,
    ) as HTMLElement | null;
    if (!el) {
        return;
    }
    return el;
}

function cleanUpElementAfterDragging(el: HTMLElement) {
    restoreElementStyle(el);
    removeDragAttributes(el);
    getOrAssignDomId(el);
}

function removeDragAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION);
}

function getAbsolutePosition(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
    };
}

export function endAllDrag() {
    const draggingElements = document.querySelectorAll(
        `[${EditorAttributes.DATA_ONLOOK_DRAGGING}]`,
    );
    for (const el of draggingElements) {
        cleanUpElementAfterDragging(el as HTMLElement);
    }
    removeStub();
}
