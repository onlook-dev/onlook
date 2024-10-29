import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { addKeyToElement, addUuidToElement, jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';
import type { CodeGroup, CodeUngroup } from '/common/models/actions/code';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const targetElements = element.targets
        .sort((a, b) => a.index - b.index)
        .map((target) => {
            const targetEl = jsxElements[target.index];
            addUuidToElement(targetEl, target.uuid);
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
            addUuidToElement(elementToInsert, target.uuid);
            addKeyToElement(elementToInsert);
            insertAtIndex(path, elementToInsert, target.index);
        }
    });

    path.stop();
}
