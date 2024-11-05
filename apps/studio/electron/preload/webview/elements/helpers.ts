import type { ActionElementLocation } from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import { InsertPos } from '@onlook/models/editor';
import type { DomElement, ParentDomElement } from '@onlook/models/element';
import { jsonClone } from '@onlook/utility';
import { uuid } from '../bundles';
import { getStyles } from './style';
import { getUniqueSelector } from '/common/helpers';

export const getDeepElement = (x: number, y: number): Element | undefined => {
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

export function getOrAssignUuid(el: HTMLElement): string {
    let id = el.getAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID);
    if (id) {
        return id;
    }

    id = uuid();
    el.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, id);
    return id;
}

export const getDomElement = (el: HTMLElement, getStyle: boolean): DomElement => {
    const parent = el.parentElement;

    const parentDomElement: ParentDomElement | undefined = parent
        ? {
              selector: getUniqueSelector(parent as HTMLElement),
              rect: parent.getBoundingClientRect() as DOMRect,
              encodedTemplateNode:
                  parent.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined,
              uuid: getOrAssignUuid(parent as HTMLElement),
          }
        : undefined;

    const rect = el.getBoundingClientRect();
    const styles = getStyle ? getStyles(el) : {};
    const selector = getUniqueSelector(el as HTMLElement);
    const encodedTemplateNode = el.getAttribute(EditorAttributes.DATA_ONLOOK_ID) || undefined;
    const domElement: DomElement = {
        selector,
        rect,
        tagName: el.tagName,
        parent: parentDomElement,
        styles,
        encodedTemplateNode,
        uuid: getOrAssignUuid(el),
    };
    return jsonClone(domElement);
};

export function restoreElementStyle(el: HTMLElement) {
    try {
        const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
        if (saved) {
            const style = JSON.parse(saved);
            for (const key in style) {
                el.style[key as any] = style[key];
            }
        }
    } catch (e) {
        console.error('Error restoring style', e);
    }
}

export function getElementLocation(targetEl: HTMLElement): ActionElementLocation | undefined {
    const parent = targetEl.parentElement;
    if (!parent) {
        return;
    }

    const parentSelector = getUniqueSelector(parent as HTMLElement);
    const location: ActionElementLocation = {
        position: InsertPos.INDEX,
        targetSelector: parentSelector,
        index: Array.from(targetEl.parentElement?.children || []).indexOf(targetEl),
    };
    return location;
}

export const isElementInserted = (selector: string): boolean => {
    const targetEl = document.querySelector(selector);
    if (!targetEl) {
        return false;
    }
    return targetEl.hasAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);
};

export const getImmediateTextContent = (el: HTMLElement): string | undefined => {
    const stringArr = Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent);

    if (stringArr.length === 0) {
        return;
    }
    return stringArr.join('');
};
