import { DOM_IGNORE_TAGS, EditorAttributes } from '@onlook/constants';

export function getHtmlElement(domId: string): HTMLElement | null {
    return document.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`);
}

export function getDomIdSelector(domId: string, escape: boolean = false) {
    const selector = `[${EditorAttributes.DATA_ONLOOK_DOM_ID}="${domId}"]`;
    if (!escape) {
        return selector;
    }
    return escapeSelector(selector);
}

export function getArrayString(items: string[]) {
    return `[${items.map((item) => `'${item}'`).join(',')}]`;
}

export function escapeSelector(selector: string) {
    return CSS.escape(selector);
}

export function isValidHtmlElement(element: Element): boolean {
    return (
        element &&
        element instanceof Node &&
        element.nodeType === Node.ELEMENT_NODE &&
        !DOM_IGNORE_TAGS.includes(element.tagName) &&
        !element.hasAttribute(EditorAttributes.DATA_ONLOOK_IGNORE) &&
        (element as HTMLElement).style.display !== 'none'
    );
}

export function isOnlookInDoc(doc: Document): boolean {
    const attributeExists = doc.evaluate(
        `//*[@${EditorAttributes.DATA_ONLOOK_ID}]`,
        doc,
        null,
        XPathResult.BOOLEAN_TYPE,
        null,
    ).booleanValue;
    return attributeExists;
}
