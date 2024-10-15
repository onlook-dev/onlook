import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { addKeyToElement } from './helpers';
import { CodeMove } from '/common/models/actions/code';

export function moveElementInNode(path: NodePath<t.JSXElement>, element: CodeMove): void {
    // Note: children includes non-JSXElement which our index does not account for. We need to find the JSXElement/JSXFragment-only index.
    const children = path.node.children;

    const jsxElements = children.filter(
        (child) => t.isJSXElement(child) || t.isJSXFragment(child),
    ) as t.JSXElement[];

    const [elementToMove] = jsxElements.splice(element.location.originalIndex, 1);

    if (!elementToMove) {
        console.error('Element not found for move:', element);
        return;
    }
    addKeyToElement(elementToMove as t.JSXElement);

    let targetIndex = Math.min(element.location.index, jsxElements.length);

    if (element.location.index > element.location.originalIndex) {
        targetIndex -= 1;
    }

    const targetChild = jsxElements[targetIndex];
    const targetChildIndex = children.indexOf(targetChild);

    const originalIndex = children.indexOf(elementToMove);
    children.splice(originalIndex, 1);
    children.splice(targetChildIndex, 0, elementToMove);
}
