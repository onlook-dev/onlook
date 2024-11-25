import { EditorAttributes } from '@onlook/models/constants';
import type { TextDomElement } from '@onlook/models/element';
import { publishEditText } from '../events/publish';
import { getDomElement, getImmediateTextContent, restoreElementStyle } from './helpers';
import { elementFromDomId } from '/common/helpers';

export function editTextByDomId(domId: string, content: string): TextDomElement | null {
    const el: HTMLElement | null = elementFromDomId(domId);
    if (!el) {
        return null;
    }
    updateTextContent(el, content);
    return getTextEditElement(el);
}

export function startEditingText(domId: string): TextDomElement | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.log('Start editing text failed. No element for selector:', domId);
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
    const textEditElement = getTextEditElement(targetEl);
    prepareElementForEditing(targetEl);
    return textEditElement;
}

export function editText(domId: string, content: string): TextDomElement | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Edit text failed. No element for selector:', domId);
        return null;
    }
    updateTextContent(el, content);
    return getTextEditElement(el);
}

export function stopEditingText(domId: string): TextDomElement | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.error('Stop editing text failed. No element for selector:', domId);
        return null;
    }
    cleanUpElementAfterEditing(el);
    publishEditText(getDomElement(el, true));
    return getTextEditElement(el);
}

function getTextEditElement(el: HTMLElement): TextDomElement {
    const domEl = getDomElement(el, true);
    return {
        ...domEl,
        textContent: el.textContent || '',
        originalContent: el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT) || '',
        styles: domEl.styles,
    };
}

function prepareElementForEditing(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }
    const style = {
        color: el.style.color,
    };

    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT, 'true');

    if (!el.hasAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT)) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT, el.textContent || '');
    }
}

function cleanUpElementAfterEditing(el: HTMLElement) {
    restoreElementStyle(el);
    removeEditingAttributes(el);
}

function removeEditingAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_EDITING_TEXT);
}

export function clearTextEditedElements() {
    const textEditedEls = document.querySelectorAll(
        `[${EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT}]`,
    );
    for (const el of textEditedEls) {
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT);
    }
}

function updateTextContent(el: HTMLElement, content: string): void {
    if (!el.hasAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT)) {
        const originalContent = getImmediateTextContent(el);
        el.setAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_CONTENT, originalContent || '');
    }
    el.textContent = content;
}
