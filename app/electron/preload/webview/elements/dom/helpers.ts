import { getImmediateTextContent, getOrAssignUuid } from '../helpers';
import { getStyles } from '../style';
import { getUniqueSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import { ActionElement, ActionElementLocation } from '/common/models/actions';

export function getActionElement(el: HTMLElement): ActionElement {
    return {
        tagName: el.tagName.toLowerCase(),
        selector: getUniqueSelector(el),
        children: Array.from(el.children).map((child) => getActionElement(child as HTMLElement)),
        attributes: {},
        textContent: getImmediateTextContent(el),
        styles: getStyles(el),
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
