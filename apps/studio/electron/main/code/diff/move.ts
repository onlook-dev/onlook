import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { addKeyToElement, jsxFilter } from './helpers';
import type { CodeMove } from '@onlook/models/actions';

export function moveElementInNode(path: NodePath<t.JSXElement>, element: CodeMove): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter).map((child) => {
        addKeyToElement(child);
        return child;
    });

    const [elementToMove] = jsxElements.splice(element.location.originalIndex, 1);
    if (!elementToMove) {
        console.error('Element not found for move');
        return;
    }

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
