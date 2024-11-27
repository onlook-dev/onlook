import type { ActionElement, ActionLocation } from '@onlook/models/actions';
import { getOrAssignDomId } from '../../ids';
import { getImmediateTextContent } from '../helpers';
import { elementFromDomId } from '/common/helpers';
import { getInstanceId, getOid } from '/common/helpers/ids';

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

    const oid = getInstanceId(el) || getOid(el) || null;
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

export function getActionLocation(domId: string): ActionLocation | null {
    const el = elementFromDomId(domId);
    if (!el) {
        throw new Error('Element not found for domId: ' + domId);
    }

    const parent = el.parentElement;
    if (!parent) {
        throw new Error('Inserted element has no parent');
    }

    const targetOid = getInstanceId(parent) || getOid(parent);
    if (!targetOid) {
        console.error('Parent element has no oid');
        return null;
    }

    const targetDomId = getOrAssignDomId(parent);
    const index: number | undefined = Array.from(parent.children).indexOf(el);
    if (index === -1) {
        return {
            type: 'append',
            targetDomId,
            targetOid,
        };
    }

    return {
        type: 'index',
        targetDomId,
        targetOid,
        index,
        originalIndex: index,
    };
}

export function isDynamicElement(selector: string): any {
    const el = document.querySelector(selector) as HTMLElement | null;

    if (!el) {
        return null;
    }

    return el.getAttribute('data-onlook-dynamic-type');
}
