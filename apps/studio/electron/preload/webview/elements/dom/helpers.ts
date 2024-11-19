import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';
import { InsertPos } from '@onlook/models/editor';
import { getOrAssignDomId } from '../../ids';
import { getImmediateTextContent } from '../helpers';
import { getOid } from '/common/helpers/ids';

export function getActionElementBySelector(selector: string): ActionElement | null {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    return getActionElement(el);
}

export function getActionElement(el: HTMLElement): ActionElement | null {
    const attributes: Record<string, string> = Array.from(el.attributes).reduce(
        (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        },
        {} as Record<string, string>,
    );

    const oid = getOid(el);
    if (!oid) {
        console.error('Element has no oid');
        return null;
    }

    return {
        oid,
        domId: getOrAssignDomId(el),
        tagName: el.tagName.toLowerCase(),
        children: Array.from(el.children)
            .map((child) => getActionElement(child as HTMLElement))
            .filter(Boolean) as ActionElement[],
        attributes,
        textContent: getImmediateTextContent(el),
        styles: {},
    };
}

export function getActionElementLocation(selector: string): ActionElementLocation | null {
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

    const targetOid = getOid(parent);
    if (!targetOid) {
        console.error('Parent element has no oid');
        return null;
    }

    return {
        targetDomId: getOrAssignDomId(parent),
        targetOid,
        position,
        index,
    };
}
