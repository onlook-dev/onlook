import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { addUuidToElement, jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';
import { CodeGroup, CodeUngroup } from '/common/models/actions/code';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    // Get target elements
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const targetElements = element.targets
        .sort((a, b) => a.index - b.index)
        .map((target) => {
            const targetEl = jsxElements[target.index];
            addUuidToElement(targetEl, target.uuid);
            return targetEl;
        });

    // Remove target elements from children
    targetElements.forEach((targetElement) => {
        removeElementAtIndex(jsxElements.indexOf(targetElement), jsxElements, children);
    });

    // Add target elements to container
    const container = createInsertedElement(element.container);
    container.children = targetElements;

    // Insert container at index
    insertAtIndex(path, container, element.location.index);

    path.stop();
}

export function ungroupElementsInNode(path: NodePath<t.JSXElement>, element: CodeUngroup): void {
    // Find the container element
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const containerIndex = element.location.index;
    const container = jsxElements[containerIndex] as t.JSXElement;

    if (!t.isJSXElement(container)) {
        throw new Error('Container element not found');
    }

    // Get the elements to ungroup
    const elementsToUngroup = container.children.filter(jsxFilter) as Array<
        t.JSXElement | t.JSXFragment
    >;

    // Remove the container from the parent
    removeElementAtIndex(containerIndex, jsxElements, children);

    // Insert the ungrouped elements back into the parent
    element.targets.forEach((target, index) => {
        const elementToInsert = elementsToUngroup[index];
        addUuidToElement(elementToInsert, target.uuid);
        if (elementToInsert) {
            const insertIndex = target.index + index; // Adjust index based on previous insertions
            children.splice(insertIndex, 0, elementToInsert);
        }
    });

    path.stop();
}
