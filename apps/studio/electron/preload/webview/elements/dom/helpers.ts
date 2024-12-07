import type { ActionElement, ActionLocation } from '@onlook/models/actions';
import { getOrAssignDomId } from '../../ids';
import { getImmediateTextContent } from '../helpers';
import { elementFromDomId } from '/common/helpers';
import { getInstanceId, getOid } from '/common/helpers/ids';
import { EditorAttributes } from '@onlook/models/constants';
import type { DynamicType } from '@onlook/models/element';

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

export function getDynamicElementType(domId: string): DynamicType | null {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`,
    ) as HTMLElement | null;

    if (!el) {
        console.warn('No element found', { domId });
        return null;
    }

    return el.getAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE) as DynamicType;
}

export function setDynamicElementType(domId: string, dynamicType: string) {
    const el = document.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`);
    if (el) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE, dynamicType);
    }
}
