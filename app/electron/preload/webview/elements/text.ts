import { uuid } from '../bundles';
import { getDomElement } from './helpers';
import { EditorAttributes } from '/common/constants';
import { TextDomElement } from '/common/models/element';

export function startEditingText(selector: string): TextDomElement | null {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.log('Start editing text failed. No element for selector:', selector);
        return null;
    }

    const childNodes = Array.from(el.childNodes).filter(
        (node) => node.nodeType !== Node.COMMENT_NODE,
    );

    if (childNodes.length === 0) {
        const newPTag = insertTextElement(el);
        return getTextEditElement(newPTag);
    } else if (childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        return getTextEditElement(el);
    }

    return null;
}

function insertTextElement(el: HTMLElement) {
    const newEl = document.createElement('p');
    const attributes = {
        [EditorAttributes.DATA_ONLOOK_UNIQUE_ID]: uuid(),
    };
    newEl.textContent = 'Hello';

    for (const [key, value] of Object.entries(attributes)) {
        newEl.setAttribute(key, value);
    }
    el.appendChild(newEl);
    return newEl;
}

function getTextEditElement(el: HTMLElement): TextDomElement {
    const domEl = getDomElement(el, true);
    el.style.color = 'transparent';

    return {
        ...domEl,
        textContent: el.textContent || '',
        styles: domEl.styles,
    };
}
