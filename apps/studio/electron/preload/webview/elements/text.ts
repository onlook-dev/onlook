import { publishEditText } from '../events/publish';
import { getDomElement, getImmediateTextContent, restoreElementStyle } from './helpers';
import { EditorAttributes } from '@onlook/models/constants';
import type { TextDomElement } from '@onlook/models/element';

export function editTextBySelector(selector: string, content: string): TextDomElement | null {
    const el: HTMLElement | null = document.querySelector(selector);
    if (!el) {
        return null;
    }
    updateTextContent(el, content);
    return getTextEditElement(el);
}

export function startEditingText(selector: string): TextDomElement | null {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.log('Start editing text failed. No element for selector:', selector);
        return null;
    }

    const childNodes = Array.from(el.childNodes).filter(
        (node) => node.nodeType !== Node.COMMENT_NODE,
    );

    let targetEl: HTMLElement | null = null;
    if (childNodes.length === 0) {
        targetEl = el;
    } else if (childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        targetEl = el;
    }
    if (!targetEl) {
        return null;
    }
    const textEditElement = getTextEditElement(targetEl);
    prepareElementForEditing(targetEl);
    return textEditElement;
}

export function editText(content: string): TextDomElement | null {
    const el = getEditingElement();
    if (!el) {
        return null;
    }
    updateTextContent(el, content);
    return getTextEditElement(el);
}

export function stopEditingText(): void {
    const el = getEditingElement();
    if (!el) {
        return;
    }
    cleanUpElementAfterEditing(el);
    publishEditText(getDomElement(el, true));
}

function getEditingElement(): HTMLElement | undefined {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_EDITING_TEXT}]`,
    ) as HTMLElement | null;
    if (!el) {
        return;
    }
    return el;
}

function getTextEditElement(el: HTMLElement): TextDomElement {
    const domEl = getDomElement(el, true);
    return {
        ...domEl,
        textContent: el.textContent || '',
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
    el.style.color = 'transparent';
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
