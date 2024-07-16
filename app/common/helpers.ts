import { EditorAttributes } from './constants';
import { TemplateNode } from './models';
import { finder } from './selector';

export function querySelectorCommand(selector: string) {
    return `document.querySelector('${CSS.escape(selector)}')`;
}

export function compareTemplateNodes(node1: TemplateNode, node2: TemplateNode): number {
    if (node1.startTag.start.line < node2.startTag.start.line) {
        return -1;
    } else if (node1.startTag.start.line > node2.startTag.start.line) {
        return 1;
    } else {
        if (node1.startTag.start.column < node2.startTag.start.column) {
            return -1;
        } else if (node1.startTag.start.column > node2.startTag.start.column) {
            return 1;
        } else {
            return 0;
        }
    }
}

export const getUniqueSelector = (el: HTMLElement, root?: Element | undefined): string => {
    let selector = el.tagName.toLowerCase();
    // If data-onlook-component-id exists, use that
    if (el.hasAttribute(EditorAttributes.DATA_ONLOOK_COMPONENT_ID)) {
        return `[${EditorAttributes.DATA_ONLOOK_COMPONENT_ID}="${el.getAttribute(
            EditorAttributes.DATA_ONLOOK_COMPONENT_ID,
        )}"]`;
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
        console.error('Error creating selector ', e);
    }
    return selector;
};
