import { EditorAttributes } from '@onlook/constants';
import type { DomElement, EditTextResult, LayerNode } from '@onlook/models';
import { getHtmlElement } from '../../helpers';
import { buildLayerTree } from '../dom';
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
    // Check for element type
    const hasOnlyTextAndBreaks = childNodes.every(node =>
        node.nodeType === Node.TEXT_NODE ||
        (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br')
    );

    if (childNodes.length === 0) {
        targetEl = el as HTMLElement;
    } else if (childNodes.length === 1 && childNodes[0]?.nodeType === Node.TEXT_NODE) {
        targetEl = el as HTMLElement;
    } else if (hasOnlyTextAndBreaks) {
        // Handle elements with text and <br> tags
        targetEl = el as HTMLElement;
    }

    if (!targetEl) {
        console.warn('Start editing text failed. No target element found for selector:', domId);
        return null;
    }

    const originalContent = extractTextContent(el);
    prepareElementForEditing(targetEl);

    return { originalContent };
}

export function editText(domId: string, content: string): { domEl: DomElement, newMap: Map<string, LayerNode> | null } | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Edit text failed. No element for selector:', domId);
        return null;
    }
    prepareElementForEditing(el);
    updateTextContent(el, content);
    return {
        domEl: getDomElement(el, true),
        newMap: buildLayerTree(el),
    };
}

export function stopEditingText(domId: string): { newContent: string; domEl: DomElement } | null {
    const el = getHtmlElement(domId);
    if (!el) {
        console.warn('Stop editing text failed. No element for selector:', domId);
        return null;
    }
    cleanUpElementAfterEditing(el);
    return { newContent: extractTextContent(el), domEl: getDomElement(el, true) };
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
    // Convert newlines to <br> tags in the DOM
    const htmlContent = content.replace(/\n/g, '<br>');
    el.innerHTML = htmlContent;
}

function extractTextContent(el: HTMLElement): string {
    let content = el.innerHTML;
    content = content.replace(/<br\s*\/?>/gi, '\n');
    content = content.replace(/<[^>]*>/g, '');
    const textArea = document.createElement('textarea');
    textArea.innerHTML = content;
    return textArea.value;
}

export function isChildTextEditable(oid: string): boolean | null {
    return true;
}