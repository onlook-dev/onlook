import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { publishEditText } from '../events/publish';
import { getDomElement, restoreElementStyle } from './helpers';
import { elementFromDomId } from '/common/helpers';

export function editTextByDomId(domId: string, content: string): DomElement | null {
    const el: HTMLElement | null = elementFromDomId(domId);
    if (!el) {
        return null;
    }
    updateTextContent(el, content);
    return getDomElement(el, true);
}

export function startEditingText(domId: string): {
    originalContent: string;
} | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Start editing text failed. No element for selector:', domId);
        return null;
    }

    const childNodes = Array.from(el.childNodes).filter(
        (node) => node.nodeType !== Node.COMMENT_NODE,
    );

    let targetEl: HTMLElement | null = null;
    if (childNodes.length === 0) {
        targetEl = el as HTMLElement;
    } else if (childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        targetEl = el as HTMLElement;
    }
    if (!targetEl) {
        console.error('Start editing text failed. No target element found for selector:', domId);
        return null;
    }
    const originalContent = el.textContent || '';
    prepareElementForEditing(targetEl);

    return { originalContent };
}

export function editText(domId: string, content: string): DomElement | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Edit text failed. No element for selector:', domId);
        return null;
    }
    prepareElementForEditing(el);
    updateTextContent(el, content);
    return getDomElement(el, true);
}

export function stopEditingText(domId: string): { newContent: string; domEl: DomElement } | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Stop editing text failed. No element for selector:', domId);
        return null;
    }
    cleanUpElementAfterEditing(el);
    publishEditText(getDomElement(el, true));
    return { newContent: el.textContent || '', domEl: getDomElement(el, true) };
}

function prepareElementForEditing(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }
    const style = {
        color: el.style.color,
    };

    // TODO: Should apply CSS style to element with attribute instead of directly setting style
    el.style.color = 'transparent';
    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT, 'true');
}

function cleanUpElementAfterEditing(el: HTMLElement) {
    restoreElementStyle(el);
    removeEditingAttributes(el);
}

function removeEditingAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT);
}

function updateTextContent(el: HTMLElement, content: string): void {
    el.textContent = content;
}
