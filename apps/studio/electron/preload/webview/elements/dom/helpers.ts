import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';
import { InsertPos } from '@onlook/models/editor';
import { getOrAssignDomId } from '../../ids';
import { getImmediateTextContent } from '../helpers';
import { elementFromDomId } from '/common/helpers';
import { getOid } from '/common/helpers/ids';

export function getActionElementByDomId(domId: string): ActionElement | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Element not found for domId:', domId);
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
        textContent: getImmediateTextContent(el) || null,
        styles: {},
    };
}

export function getActionElementLocation(domId: string): ActionElementLocation | null {
    const el = elementFromDomId(domId);
    if (!el) {
        throw new Error('Element not found for domId: ' + domId);
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
