import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { CodeGroup, CodeUngroup } from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import { addKeyToElement, addParamToElement, jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const targetElements = element.targets
        .sort((a, b) => a.index - b.index)
        .map((target) => {
            const targetEl = jsxElements[target.index];
            addParamToElement(targetEl, EditorAttributes.DATA_ONLOOK_ID, target.oid);
            addKeyToElement(targetEl);
            return targetEl;
        });

    targetElements.forEach((targetElement) => {
        removeElementAtIndex(jsxElements.indexOf(targetElement), jsxElements, children);
    });

    const container = createInsertedElement(element.container);
    container.children = targetElements;

    insertAtIndex(path, container, element.location.index);
    path.stop();
}

export function ungroupElementsInNode(path: NodePath<t.JSXElement>, element: CodeUngroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const containerIndex = element.location.index;
    const container = jsxElements[containerIndex] as t.JSXElement;

    if (!t.isJSXElement(container)) {
        throw new Error('Container element not found');
    }

    const elementsToUngroup: Array<t.JSXElement | t.JSXFragment> =
        container.children.filter(jsxFilter);
    removeElementAtIndex(containerIndex, jsxElements, children);

    const sortedTargets = [...element.targets].sort((a, b) => a.index - b.index);
    sortedTargets.forEach((target, i) => {
        const elementToInsert = elementsToUngroup[i];
        if (elementToInsert) {
            addParamToElement(elementToInsert, EditorAttributes.DATA_ONLOOK_ID, target.oid);
            addKeyToElement(elementToInsert);
            insertAtIndex(path, elementToInsert, target.index);
        }
    });

    path.stop();
}
