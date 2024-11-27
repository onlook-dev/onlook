import type { ActionElement, ActionLocation } from '@onlook/models/actions';
import { EditorAttributes, INLINE_ONLY_CONTAINERS } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { getOrAssignDomId } from '../../ids';
import cssManager from '../../style';
import { getDeepElement, getDomElement } from '../helpers';
import { assertNever, elementFromDomId } from '/common/helpers';
import { getInstanceId, getOid } from '/common/helpers/ids';

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

export function getInsertLocation(x: number, y: number): ActionLocation | undefined {
    const targetEl = findNearestBlockLevelContainer(x, y);
    if (!targetEl) {
        return;
    }
    const display = window.getComputedStyle(targetEl).display;
    const isStackOrGrid = display === 'flex' || display === 'grid';
    if (isStackOrGrid) {
        const index = findClosestIndex(targetEl, y);
        return {
            type: 'index',
            targetDomId: getOrAssignDomId(targetEl),
            targetOid: getInstanceId(targetEl) || getOid(targetEl) || null,
            index,
            originalIndex: index,
        };
    }
    return {
        type: 'append',
        targetDomId: getOrAssignDomId(targetEl),
        targetOid: getInstanceId(targetEl) || getOid(targetEl) || null,
    };
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
    location: ActionLocation,
): DomElement | undefined {
    const targetEl = elementFromDomId(location.targetDomId);
    if (!targetEl) {
        console.error(`Target element not found: ${location.targetDomId}`);
        return;
    }
    const newEl = createElement(element);

    switch (location.type) {
        case 'append':
            targetEl.appendChild(newEl);
            break;
        case 'prepend':
            targetEl.prepend(newEl);
            break;
        case 'index':
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
            console.error(`Invalid position: ${location}`);
            assertNever(location);
    }

    const domEl = getDomElement(newEl, true);
    return domEl;
}

export function createElement(element: ActionElement) {
    const newEl = document.createElement(element.tagName);
    newEl.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');

    for (const [key, value] of Object.entries(element.attributes)) {
        newEl.setAttribute(key, value);
    }

    if (element.textContent !== null && element.textContent !== undefined) {
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

export function removeElement(location: ActionLocation): DomElement | null {
    const targetEl = elementFromDomId(location.targetDomId);

    if (!targetEl) {
        console.error(`Target element not found: ${location.targetDomId}`);
        return null;
    }

    let elementToRemove: HTMLElement | null = null;

    switch (location.type) {
        case 'append':
            elementToRemove = targetEl.lastElementChild as HTMLElement | null;
            break;
        case 'prepend':
            elementToRemove = targetEl.firstElementChild as HTMLElement | null;
            break;
        case 'index':
            if (location.index !== -1) {
                elementToRemove = targetEl.children.item(location.index) as HTMLElement | null;
            } else {
                console.error(`Invalid index: ${location.index}`);
                return null;
            }
            break;
        default:
            console.error(`Invalid position: ${location}`);
            assertNever(location);
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
