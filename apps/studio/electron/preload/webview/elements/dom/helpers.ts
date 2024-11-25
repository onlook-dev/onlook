import { getImmediateTextContent, getOrAssignUuid } from '../helpers';
import { getUniqueSelector } from '/common/helpers';
import { InsertPos } from '@onlook/models/editor';
import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';

export function getActionElementBySelector(selector: string): ActionElement | null {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    return getActionElement(el);
}

export function getActionElement(el: HTMLElement): ActionElement {
    const attributes: Record<string, string> = Array.from(el.attributes).reduce(
        (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        },
        {} as Record<string, string>,
    );

    return {
        tagName: el.tagName.toLowerCase(),
        selector: getUniqueSelector(el),
        children: Array.from(el.children).map((child) => getActionElement(child as HTMLElement)),
        attributes,
        textContent: getImmediateTextContent(el),
        styles: {},
        uuid: getOrAssignUuid(el),
    };
}

export function getActionElementLocation(selector: string): ActionElementLocation {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) {
        throw new Error('Element not found for selector: ' + selector);
    }

    const parent = el.parentElement;
    if (!parent) {
        throw new Error('Inserted element has no parent');
    }
    const index: number | undefined = Array.from(parent.children).indexOf(el);
    let position = InsertPos.INDEX;

    if (index === -1) {
        position = InsertPos.APPEND;
    }

    return {
        targetSelector: getUniqueSelector(parent),
        position,
        index,
    };
}

export function isDynamicElement(selector: string): any {
    const el = document.querySelector(selector) as HTMLElement | null;

    if (!el) {
        return null;
    }

    return el.getAttribute('data-onlook-dynamic-type');
}
