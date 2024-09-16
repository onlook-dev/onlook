import { CssStyleChange } from '../changes';
import { getDeepElement, getDomElement } from './helpers';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { EditorAttributes, INLINE_ONLY_CONTAINERS } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import { DomElement } from '/common/models/element';
import { DomActionType, InsertedElement } from '/common/models/element/domAction';

export function getInsertLocation(x: number, y: number): ActionElementLocation | undefined {
    const targetEl = findNearestBlockLevelContainer(x, y);
    if (!targetEl) {
        return;
    }
    const targetSelector = getUniqueSelector(targetEl);
    const location: ActionElementLocation = {
        position: InsertPos.APPEND,
        targetSelector: targetSelector,
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
    style: Record<string, string>,
): DomElement | undefined {
    const targetEl = document.querySelector(location.targetSelector);
    if (!targetEl) {
        console.error(`Target element not found: ${location.targetSelector}`);
        return;
    }

    const newEl = document.createElement(element.tagName);
    for (const [key, value] of Object.entries(element.attributes)) {
        newEl.setAttribute(key, value);
    }

    switch (location.position) {
        case InsertPos.APPEND:
            targetEl.appendChild(newEl);
            break;
        case InsertPos.PREPEND:
            targetEl.prepend(newEl);
            break;
        case InsertPos.BEFORE:
            targetEl.before(newEl);
            break;
        case InsertPos.AFTER:
            targetEl.after(newEl);
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
            return;
    }

    const change = new CssStyleChange();
    const selector = getUniqueSelector(newEl);
    for (const [key, value] of Object.entries(style)) {
        change.updateStyle(selector, key, value);
    }

    const domEl = getDomElement(newEl, true);
    return domEl;
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
        case InsertPos.BEFORE:
            elementToRemove = targetEl.previousElementSibling as HTMLElement | null;
            break;
        case InsertPos.AFTER:
            elementToRemove = targetEl.nextElementSibling as HTMLElement | null;
            break;
        case InsertPos.INDEX:
            if (location.index !== undefined) {
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
        elementToRemove.remove();
        return domEl;
    } else {
        console.warn(`No element found to remove at the specified location`);
        return null;
    }
}

export function getInsertedElements(): InsertedElement[] {
    const insertedEls = Array.from(
        document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_INSERTED}]`),
    )
        .filter((el) => {
            const parent = el.parentElement;
            return !parent || !parent.hasAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);
        })
        .map((el) => getInsertedElement(el as HTMLElement))
        .sort((a, b) => a.timestamp - b.timestamp);

    return insertedEls;
}

function getInsertedElement(el: HTMLElement): InsertedElement {
    return {
        type: DomActionType.INSERT,
        tagName: el.tagName.toLowerCase(),
        selector: getUniqueSelector(el),
        children: Array.from(el.children).map((child) => getInsertedElement(child as HTMLElement)),
        timestamp: parseInt(el.getAttribute(EditorAttributes.DATA_ONLOOK_TIMESTAMP) || '0'),
        attributes: {},
        location: getInsertedLocation(el),
        textContent: el.textContent || undefined,
    };
}

function getInsertedLocation(el: HTMLElement): ActionElementLocation {
    const parent = el.parentElement;
    if (!parent) {
        throw new Error('Inserted element has no parent');
    }
    let index: number | undefined = Array.from(parent.children).indexOf(el);
    let position = InsertPos.INDEX;

    if (index === -1) {
        position = InsertPos.APPEND;
        index = undefined;
    }

    return {
        targetSelector: getUniqueSelector(parent),
        position,
        index,
    };
}

export function removeInsertedElements() {
    const insertedEls = document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_INSERTED}]`);
    for (const el of insertedEls) {
        el.remove();
    }
}
