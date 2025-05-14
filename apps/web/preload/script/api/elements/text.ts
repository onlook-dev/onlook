import { EditorAttributes } from '@onlook/constants';
import type { DomElement, EditTextResult } from '@onlook/models';
import { getHtmlElement } from '../../helpers';
import { publishEditText } from '../events/publish';
import { getDomElement, restoreElementStyle } from './helpers';

export function editTextByDomId(domId: string, content: string): DomElement | null {
    const el: HTMLElement | null = getHtmlElement(domId);
    if (!el) {
        return null;
    }
    updateTextContent(el, content);
    return getDomElement(el, true);
}

export function startEditingText(domId: string): EditTextResult | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Start editing text failed. No element for selector:', domId);
        return null;
    }

    const childNodes = Array.from(el.childNodes).filter(
        (node) => node.nodeType !== Node.COMMENT_NODE,
    );

    let targetEl: HTMLElement | null = null;
    if (childNodes.length === 0) {
        targetEl = el as HTMLElement;
    } else if (childNodes.length === 1 && el.childNodes[0]?.nodeType === Node.TEXT_NODE) {
        targetEl = el as HTMLElement;
    }
    if (!targetEl) {
        console.warn('Start editing text failed. No target element found for selector:', domId);
        return null;
    }
    const originalContent = el.textContent || '';
    prepareElementForEditing(targetEl);

    return { originalContent };
}

export function editText(domId: string, content: string): DomElement | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Edit text failed. No element for selector:', domId);
        return null;
    }
    prepareElementForEditing(el);
    updateTextContent(el, content);
    return getDomElement(el, true);
}

export function stopEditingText(domId: string): { newContent: string; domEl: DomElement } | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Stop editing text failed. No element for selector:', domId);
        return null;
    }
    cleanUpElementAfterEditing(el);
    publishEditText(getDomElement(el, true));
    return { newContent: el.textContent || '', domEl: getDomElement(el, true) };
}

function prepareElementForEditing(el: HTMLElement) {
    el.setAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT, 'true');
}

function cleanUpElementAfterEditing(el: HTMLElement) {
    restoreElementStyle(el);
    removeEditingAttributes(el);
}

function removeEditingAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT);
}

function updateTextContent(el: HTMLElement, content: string): void {
    el.textContent = content;
}

export function isChildTextEditable(oid: string): boolean | null {
    return true;
}