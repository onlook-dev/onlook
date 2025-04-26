import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import type { CodeMove } from '@onlook/models/actions';
import { addKeyToElement, getOidFromJsxElement, jsxFilter } from './helpers';

export function moveElementInNode(path: NodePath<t.JSXElement>, element: CodeMove): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter).map((child) => {
        return child;
    });

    const elementToMove = jsxElements.find((child) => {
        if (child.type !== 'JSXElement' || !child.openingElement) {
            return false;
        }
        const oid = getOidFromJsxElement(child.openingElement);
        return oid === element.oid;
    });

    if (!elementToMove) {
        console.error('Element not found for move');
        return;
    }

    addKeyToElement(elementToMove);

    const targetIndex = Math.min(element.location.index, jsxElements.length);
    const targetChild = jsxElements[targetIndex];
    const targetChildIndex = children.indexOf(targetChild);
    const originalIndex = children.indexOf(elementToMove);

    // Move to new location
    children.splice(originalIndex, 1);
    children.splice(targetChildIndex, 0, elementToMove);
}
