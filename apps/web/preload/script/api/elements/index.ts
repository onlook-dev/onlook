import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { elementFromDomId } from '../../helpers';
import { getDomElement } from './helpers';
export const getDomElementByDomId = (domId: string, style: boolean): DomElement => {
    const el = elementFromDomId(domId) || document.body;
    return getDomElement(el as HTMLElement, style);
};

export const getElementAtLoc = (x: number, y: number, getStyle: boolean): DomElement => {
    const el = getDeepElement(x, y) || document.body;
    return getDomElement(el as HTMLElement, getStyle);
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

export const updateElementInstance = (domId: string, instanceId: string, component: string) => {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn('Failed to updateElementInstanceId: Element not found');
        return;
    }
    el.setAttribute(EditorAttributes.DATA_ONLOOK_INSTANCE_ID, instanceId);
    el.setAttribute(EditorAttributes.DATA_ONLOOK_COMPONENT_NAME, component);
};

export const getParentElement = (domId: string) => {
    const el = elementFromDomId(domId);
    if (!el?.parentElement) {
        return null;
    }
    return getDomElement(el.parentElement, false);
};

export const getChildrenCount = (domId: string) => {
    const el = elementFromDomId(domId);
    if (!el) {
        return 0;
    }
    return el.children.length;
};

export const getOffsetParent = (domId: string) => {
    const el = elementFromDomId(domId);
    if (!el) {
        return null;
    }
    return getDomElement(el.offsetParent as HTMLElement, false);
};
