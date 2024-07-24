import { EditorAttributes } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { ElementMetadata } from '/common/models/element';

export const getElementsMetadataFromSelector = (
    selector: string,
    multi = false,
): ElementMetadata[] => {
    const el = document.querySelector(selector) || document.body;
    const els = multi ? getRelatedElements(el as HTMLElement) : [el as HTMLElement];
    const elsMetadata = els.map((el) => getElementMetadata(el));
    return [getElementMetadata(el as HTMLElement), ...elsMetadata];
};

export const getElementsMetadataFromMouseEvent = (
    x: number,
    y: number,
    multi = false,
): ElementMetadata[] => {
    const el = deepElementFromPoint(x, y) || document.body;
    const els = multi ? getRelatedElements(el as HTMLElement) : [el as HTMLElement];
    const elsMetadata = els.map((el) => getElementMetadata(el));
    return [getElementMetadata(el as HTMLElement), ...elsMetadata];
};

export const getElementMetadata = (el: HTMLElement): ElementMetadata => {
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

export const getRelatedElements = (el: HTMLElement): HTMLElement[] => {
    const dataOnlookId = el.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;
    if (!dataOnlookId) {
        return [];
    }

    const els = document.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_ID}="${dataOnlookId}"]`);
    return Array.from(els) as HTMLElement[];
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
