import { EditorAttributes } from '@onlook/constants';
import type { CoreElementType, DomElement, DynamicType } from '@onlook/models';
import type { ActionElement, ActionLocation } from '@onlook/models/actions';
import { getHtmlElement } from '../../../helpers';
import { getInstanceId, getOid, getOrAssignDomId } from '../../../helpers/ids';
import { getDomElement, getImmediateTextContent } from '../helpers';

export function getActionElement(domId: string): ActionElement | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Element not found for domId:', domId);
        return null;
    }

    return getActionElementFromHtmlElement(el);
}

export function getActionElementFromHtmlElement(el: HTMLElement): ActionElement | null {
    const attributes: Record<string, string> = Array.from(el.attributes).reduce(
        (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        },
        {} as Record<string, string>,
    );

    const oid = getInstanceId(el) || getOid(el) || null;
    if (!oid) {
        console.warn('Element has no oid');
        return null;
    }

    return {
        oid,
        domId: getOrAssignDomId(el),
        tagName: el.tagName.toLowerCase(),
        children: Array.from(el.children)
            .map((child) => getActionElementFromHtmlElement(child as HTMLElement))
            .filter(Boolean) as ActionElement[],
        attributes,
        textContent: getImmediateTextContent(el) || null,
        styles: {},
    };
}

export function getActionLocation(domId: string): ActionLocation | null {
    const el = getHtmlElement(domId);
    if (!el) {
        throw new Error('Element not found for domId: ' + domId);
    }

    const parent = el.parentElement;
    if (!parent) {
        throw new Error('Inserted element has no parent');
    }

    const targetOid = getInstanceId(parent) || getOid(parent);
    if (!targetOid) {
        console.warn('Parent element has no oid');
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

export function getElementType(domId: string): {
    dynamicType: DynamicType | null;
    coreType: CoreElementType | null;
} {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`,
    ) as HTMLElement | null;

    if (!el) {
        console.warn('No element found', { domId });
        return { dynamicType: null, coreType: null };
    }

    const dynamicType =
        (el.getAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE) as DynamicType) || null;
    const coreType =
        (el.getAttribute(EditorAttributes.DATA_ONLOOK_CORE_ELEMENT_TYPE) as CoreElementType) ||
        null;

    return { dynamicType, coreType };
}

export function setElementType(
    domId: string,
    dynamicType: DynamicType | null,
    coreElementType: CoreElementType | null,
) {
    const el = document.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`);

    if (el) {
        if (dynamicType) {
            el.setAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE, dynamicType);
        }
        if (coreElementType) {
            el.setAttribute(EditorAttributes.DATA_ONLOOK_CORE_ELEMENT_TYPE, coreElementType);
        }
    }
}

export function getFirstOnlookElement(): DomElement | null {
    const body = document.body;
    const firstElement = body.querySelector(`[${EditorAttributes.DATA_ONLOOK_ID}]`);
    if (firstElement) {
        return getDomElement(firstElement as HTMLElement, true);
    }
    return null;
}
