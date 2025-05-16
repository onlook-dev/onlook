import { EditorAttributes } from '@onlook/constants';
import type { DomElement } from '@onlook/models';
import { getHtmlElement, isValidHtmlElement } from '../../../helpers';
import { getOrAssignDomId } from '../../../helpers/ids';
import { getDomElement, restoreElementStyle } from '../helpers';
import { getDisplayDirection } from './helpers';
import { createStub, getCurrentStubIndex, moveStub, removeStub } from './stub';

export function startDrag(domId: string): number | null {
    const el = getHtmlElement(domId);
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
    if (el.style.position !== 'absolute') {
        createStub(el);
    }
    const pos = getAbsolutePosition(el);
    const rect = el.getBoundingClientRect();
    const offset = {
        x: pos.left - rect.left,
        y: pos.top - rect.top
    };
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION, JSON.stringify({ ...pos, offset }));
    return originalIndex;
}

export function drag(domId: string, dx: number, dy: number, x: number, y: number, positionType: 'fixed' | 'absolute' = 'fixed') {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Dragging element not found');
        return;
    }
    
    if (!el.style.transition) {
        el.style.transition = 'transform 0.05s cubic-bezier(0.2, 0, 0, 1)';
    }
    
    const pos = JSON.parse(
        el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION) || '{}'
    );
    
    if (el.style.position !== positionType) {
        const styles = window.getComputedStyle(el);
        
        el.style.position = positionType;
        el.style.width = styles.width;
        el.style.height = styles.height;
        
        if (positionType === 'absolute') {
            const parent = el.parentElement;
            if (parent) {
                const parentRect = parent.getBoundingClientRect();
                el.style.left = `${pos.left - parentRect.left - pos.offset.x}px`;
                el.style.top = `${pos.top - parentRect.top - pos.offset.y}px`;
            }
        } else {
            el.style.left = `${pos.left}px`;
            el.style.top = `${pos.top}px`;
        }
    }


    if (positionType === 'absolute') {
        const parent = el.parentElement;    
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            const newLeft = x - parentRect.left - pos.offset.x;
            const newTop = y - parentRect.top - pos.offset.y;
            el.style.left = `${newLeft}px`;
            el.style.top = `${newTop}px`;
        }
        el.style.transform = 'none';
    } else {
        const finalDx = dx;
        const finalDy = dy;
        el.style.transform = `translate(${finalDx}px, ${finalDy}px)`;
    }

    // Only move stub for fixed positioning
    if (positionType === 'fixed') {
        const parent = el.parentElement;
        if (parent) {
            moveStub(el, x, y);
        }
    }
}

export function endDragAbsolute(domId: string): {
    left: string;
    top: string;
} | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('End drag element not found');
        return null;
    }
    const styles = window.getComputedStyle(el);
    removeDragAttributes(el);
    getOrAssignDomId(el);
    return {
        left: styles.left,
        top: styles.top,
    }
}

export function endDrag(domId: string): {
    newIndex: number;
    child: DomElement;
    parent: DomElement;
} | null {
    const el = getHtmlElement(domId);
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
        child: getDomElement(el, false),
        parent: getDomElement(parent, false),
    };
}

function prepareElementForDragging(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_SAVED_STYLE);
    if (saved) {
        return;
    }

    // Save all relevant style properties for later restoration
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
    
    // Ensure element appears above others during drag
    el.style.zIndex = '1000';

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
    for (const el of Array.from(draggingElements)) {
        cleanUpElementAfterDragging(el as HTMLElement);
    }
    removeStub();
}
