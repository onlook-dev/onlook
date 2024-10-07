import { EditorAttributes } from '/common/constants';

interface ClonedElement {
    selector: string;
    html: string;
    dataOnlookId?: string;
}

export function copyElementBySelector(selector: string): ClonedElement | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const clonedEl = el.cloneNode(true) as HTMLElement;
    const onlookId = clonedEl.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;
    clonedEl.removeAttribute(EditorAttributes.DATA_ONLOOK_ID);
    clonedEl.removeAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID);
    clonedEl.removeAttribute(EditorAttributes.DATA_ONLOOK_TIMESTAMP);

    const serializedEl = new XMLSerializer().serializeToString(clonedEl);
    return {
        selector,
        html: serializedEl,
        dataOnlookId: onlookId,
    };
}

export function pastElementAfterSelector(selector: string, html: string) {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) {
        console.error('Element not found for selector:', selector);
        return;
    }
    el.insertAdjacentHTML('afterend', html);
}
