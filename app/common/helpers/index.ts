import { DOM_IGNORE_TAGS, EditorAttributes } from '../constants';
import { finder } from '../selector';
import { assignUniqueId } from '/electron/preload/webview/elements/helpers';

export function escapeSelector(selector: string) {
    return CSS.escape(selector);
}
export function querySelectorCommand(selector: string) {
    return `document.querySelector('${escapeSelector(selector)}')`;
}

export const getUniqueSelector = (el: HTMLElement, root?: Element | undefined): string => {
    let selector = el.tagName.toLowerCase();

    assignUniqueId(el);

    const onlookUniqueId = getOnlookUniqueSelector(el);
    if (onlookUniqueId) {
        return onlookUniqueId;
    }
    try {
        if (el.nodeType !== Node.ELEMENT_NODE) {
            return selector;
        }
        if (root) {
            selector = finder(el, { className: () => false, root });
        } else {
            selector = finder(el, { className: () => false });
        }
    } catch (e) {
        console.warn('Error creating selector ', e);
    }
    return selector;
};

export const getOnlookUniqueSelector = (el: HTMLElement): string | null => {
    const uniqueId = el.getAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID);
    if (uniqueId) {
        return `[${EditorAttributes.DATA_ONLOOK_UNIQUE_ID}="${uniqueId}"]`;
    }
    return null;
};

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function isValidHtmlElement(element: Element): boolean {
    return (
        element &&
        element instanceof Node &&
        element.nodeType === Node.ELEMENT_NODE &&
        !DOM_IGNORE_TAGS.includes(element.tagName) &&
        !element.hasAttribute(EditorAttributes.DATA_ONLOOK_IGNORE)
    );
}

export function isOnlookInDoc(doc: Document): boolean {
    const attributeExists = doc.evaluate(
        '//*[@data-onlook-id]',
        doc,
        null,
        XPathResult.BOOLEAN_TYPE,
        null,
    ).booleanValue;
    return attributeExists;
}
