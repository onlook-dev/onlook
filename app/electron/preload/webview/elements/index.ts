import { EditorAttributes } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { ElementMetadata } from '/common/models';

export const getElMetadataFromMouseEvent = (x: number, y: number): object => {
    const el = deepElementFromPoint(x, y) || document.body;
    return getElMetadata(el as HTMLElement);
};

export const getElMetadata = (el: HTMLElement): ElementMetadata => {
    const tagName = el.tagName.toLowerCase();
    const rect = el.getBoundingClientRect();
    const parentRect = getParentRect(el as HTMLElement);
    const computedStyle = window.getComputedStyle(el);
    const selector = getUniqueSelector(el as HTMLElement);
    const dataOnlookId = el.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;

    const metadata: ElementMetadata = {
        tagName,
        selector,
        rect,
        parentRect: parentRect || rect,
        computedStyle,
        webviewId: '',
        dataOnlookId,
    };
    return metadata;
};

const getParentRect = (el: HTMLElement): DOMRect | null => {
    const parent = el.parentElement;
    if (!parent) {
        return null;
    }
    return parent.getBoundingClientRect();
};

export const deepElementFromPoint = (x: number, y: number): Element | undefined => {
    const el = document.elementFromPoint(x, y);
    if (!el) {
        return;
    }
    const crawlShadows = (node: Element): Element => {
        if (node?.shadowRoot) {
            const potential = node.shadowRoot.elementFromPoint(x, y);
            if (potential == node) {
                return node;
            } else if (potential?.shadowRoot) {
                return crawlShadows(potential);
            } else {
                return potential || node;
            }
        } else {
            return node;
        }
    };

    const nested_shadow = crawlShadows(el);
    return nested_shadow || el;
};
