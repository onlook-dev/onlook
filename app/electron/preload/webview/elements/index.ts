import { getStyles } from './style';
import { EditorAttributes } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { DomElement, ParentDomElement } from '/common/models/element';

export const getElementWithSelector = (selector: string): DomElement => {
    const el = (document.querySelector(selector) as HTMLElement) || document.body;
    return getDomElement(el);
};

export const getElements = (selector: string): DomElement[] => {
    const el = document.querySelector(selector) || document.body;
    const els = getRelatedElements(el as HTMLElement);
    const elsMetadata = els.map((el) => getDomElement(el));
    return [getDomElement(el as HTMLElement), ...elsMetadata];
};

export const getElementAtLoc = (x: number, y: number): DomElement => {
    const el = getDeepElement(x, y) || document.body;
    return getDomElement(el as HTMLElement);
};

export const getElementsAtLoc = (x: number, y: number): DomElement[] => {
    const el = (getDeepElement(x, y) as HTMLElement) || document.body;
    const els = [el, ...getRelatedElements(el as HTMLElement)];
    const elsMetadata = els.map((element) => getDomElement(element));
    return elsMetadata;
};

const getDomElement = (el: HTMLElement): DomElement => {
    const parent = el.parentElement;
    const parentDomElement: ParentDomElement = {
        selector: getUniqueSelector(parent as HTMLElement),
        rect: parent?.getBoundingClientRect() as DOMRect,
        encodedTemplateNode: parent?.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined,
    };

    const rect = el.getBoundingClientRect();
    const styles = getStyles(el);
    const selector = getUniqueSelector(el as HTMLElement);
    const encodedTemplateNode = el.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;
    const domElement: DomElement = {
        selector,
        rect,
        tagName: el.tagName,
        parent: parentDomElement,
        styles,
        encodedTemplateNode,
    };
    return JSON.parse(JSON.stringify(domElement));
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
