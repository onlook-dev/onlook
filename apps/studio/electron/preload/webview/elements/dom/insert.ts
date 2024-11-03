import { cssManager } from '../../style';
import { getDeepElement, getDomElement } from '../helpers';
import { EditorAttributes, INLINE_ONLY_CONTAINERS } from '@onlook/models/constants';
import { assertNever, getUniqueSelector } from '/common/helpers';
import { InsertPos } from '@onlook/models/editor';
import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';

function findClosestIndex(container: HTMLElement, y: number): number {
    const children = Array.from(container.children);

    if (children.length === 0) {
        return 0;
    }

    let closestIndex = 0;

    let minDistance = Infinity;

    children.forEach((child, index) => {
        const rect = child.getBoundingClientRect();

        const childMiddle = rect.top + rect.height / 2;

        const distance = Math.abs(y - childMiddle);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    const closestRect = children[closestIndex].getBoundingClientRect();

    const closestMiddle = closestRect.top + closestRect.height / 2;

    return y > closestMiddle ? closestIndex + 1 : closestIndex;
}

export function getInsertLocation(x: number, y: number): ActionElementLocation | undefined {
    const targetEl = findNearestBlockLevelContainer(x, y);
    if (!targetEl) {
        return;
    }
    const targetSelector = getUniqueSelector(targetEl);
    const display = window.getComputedStyle(targetEl).display;
    const isStackOrGrid = display === 'flex' || display === 'grid';
    const location: ActionElementLocation = {
        position: isStackOrGrid ? InsertPos.INDEX : InsertPos.APPEND,
        targetSelector: targetSelector,
        index: isStackOrGrid ? findClosestIndex(targetEl, y) : -1,
    };
    return location;
}

function findNearestBlockLevelContainer(x: number, y: number): HTMLElement | null {
    let targetEl = getDeepElement(x, y) as HTMLElement | null;
    if (!targetEl) {
        return null;
    }

    let inlineOnly = true;
    while (targetEl && inlineOnly) {
        inlineOnly = INLINE_ONLY_CONTAINERS.has(targetEl.tagName.toLowerCase());
        if (inlineOnly) {
            targetEl = targetEl.parentElement;
        }
    }
    return targetEl;
}

export function insertElement(
    element: ActionElement,
    location: ActionElementLocation,
): DomElement | undefined {
    const targetEl = document.querySelector(location.targetSelector);
    if (!targetEl) {
        console.error(`Target element not found: ${location.targetSelector}`);
        return;
    }

    const newEl = createElement(element);

    switch (location.position) {
        case InsertPos.APPEND:
            targetEl.appendChild(newEl);
            break;
        case InsertPos.PREPEND:
            targetEl.prepend(newEl);
            break;
        case InsertPos.INDEX:
            if (location.index === undefined || location.index < 0) {
                console.error(`Invalid index: ${location.index}`);
                return;
            }

            if (location.index >= targetEl.children.length) {
                targetEl.appendChild(newEl);
            } else {
                targetEl.insertBefore(newEl, targetEl.children.item(location.index));
            }
            break;
        default:
            console.error(`Invalid position: ${location.position}`);
            assertNever(location.position);
    }

    const domEl = getDomElement(newEl, true);
    return domEl;
}

export function createElement(element: ActionElement) {
    const newEl = document.createElement(element.tagName);
    newEl.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
    newEl.removeAttribute(EditorAttributes.DATA_ONLOOK_ID);

    for (const [key, value] of Object.entries(element.attributes)) {
        newEl.setAttribute(key, value);
    }

    if (element.textContent) {
        newEl.textContent = element.textContent;
    }

    for (const [key, value] of Object.entries(element.styles)) {
        newEl.style.setProperty(cssManager.jsToCssProperty(key), value);
    }

    for (const child of element.children) {
        const childEl = createElement(child);
        newEl.appendChild(childEl);
    }

    return newEl;
}

export function removeElement(location: ActionElementLocation): DomElement | null {
    const targetEl = document.querySelector(location.targetSelector) as HTMLElement | null;

    if (!targetEl) {
        console.error(`Target element not found: ${location.targetSelector}`);
        return null;
    }

    let elementToRemove: HTMLElement | null = null;

    switch (location.position) {
        case InsertPos.APPEND:
            elementToRemove = targetEl.lastElementChild as HTMLElement | null;
            break;
        case InsertPos.PREPEND:
            elementToRemove = targetEl.firstElementChild as HTMLElement | null;
            break;
        case InsertPos.INDEX:
            if (location.index !== -1) {
                elementToRemove = targetEl.children.item(location.index) as HTMLElement | null;
            } else {
                console.error(`Invalid index: ${location.index}`);
                return null;
            }
            break;
        default:
            console.error(`Invalid position: ${location.position}`);
            return null;
    }

    if (elementToRemove) {
        const domEl = getDomElement(elementToRemove, true);
        elementToRemove.style.display = 'none';
        return domEl;
    } else {
        console.warn(`No element found to remove at the specified location`);
        return null;
    }
}

export function removeDuplicateInsertedElement(uuid: string) {
    const els = document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_UNIQUE_ID}="${uuid}"]`);
    els.forEach((el) => {
        if (el.getAttribute(EditorAttributes.DATA_ONLOOK_INSERTED)) {
            el.remove();
        }
    });
}
