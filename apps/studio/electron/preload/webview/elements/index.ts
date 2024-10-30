import { getDomElement } from './helpers';
import { EditorAttributes } from '@onlook/models/constants';
import { getUniqueSelector } from '/common/helpers';
import type { DomElement } from '@onlook/models/element';

export const getSelectorAtLoc = (x: number, y: number): string => {
    const el = getDeepElement(x, y) || document.body;
    return getUniqueSelector(el as HTMLElement);
};

export const getElementWithSelector = (selector: string, style: boolean): DomElement => {
    const el = (document.querySelector(selector) as HTMLElement) || document.body;
    return getDomElement(el, style);
};

export const getElements = (selector: string, style: boolean): DomElement[] => {
    const el = document.querySelector(selector) || document.body;
    const els = getRelatedElements(el as HTMLElement);
    const elsMetadata = els.map((el) => getDomElement(el, style));
    return [getDomElement(el as HTMLElement, style), ...elsMetadata];
};

export const getElementAtLoc = (x: number, y: number, getStyle: boolean): DomElement => {
    const el = getDeepElement(x, y) || document.body;
    return getDomElement(el as HTMLElement, getStyle);
};

export const getElementsAtLoc = (x: number, y: number, style: boolean): DomElement[] => {
    const el = (getDeepElement(x, y) as HTMLElement) || document.body;
    const els = [el, ...getRelatedElements(el as HTMLElement)];
    const elsMetadata = els.map((element) => getDomElement(element, style));
    return elsMetadata;
};

const getRelatedElements = (el: HTMLElement): HTMLElement[] => {
    const encodedTemplateNode = el.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;
    if (!encodedTemplateNode) {
        return [];
    }

    const els = document.querySelectorAll(
        `[${EditorAttributes.DATA_ONLOOK_ID}="${encodedTemplateNode}"]`,
    );
    return Array.from(els) as HTMLElement[];
};

const getDeepElement = (x: number, y: number): Element | undefined => {
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
