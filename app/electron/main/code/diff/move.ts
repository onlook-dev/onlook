import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { getTemplateNode } from '../templateNode';
import { addKeyToElement, hashTemplateNode } from './helpers';
import { CodeMove } from '/common/models/actions/code';

export function moveElementInNode(
    path: NodePath<t.JSXElement>,
    filepath: string,
    element: CodeMove,
): void {
    // Note: children includes non-JSXElement which our index does not account for. We need to find the JSXElement/JSXFragment-only index.
    const children = path.node.children;
    const elementToMoveIndex = children.findIndex((child) => {
        if (t.isJSXElement(child)) {
            const childTemplate = getTemplateNode(child, filepath, 1);
            const hashChild = hashTemplateNode(childTemplate);
            const hashElement = hashTemplateNode(element.childTemplateNode);
            return hashChild === hashElement;
        }
        return false;
    });

    if (elementToMoveIndex !== -1) {
        const [elementToMove] = children.splice(elementToMoveIndex, 1);
        addKeyToElement(elementToMove as t.JSXElement);
        const jsxElements = children.filter(
            (child) => t.isJSXElement(child) || t.isJSXFragment(child) || child === elementToMove,
        ) as t.JSXElement[];

        const targetIndex = Math.min(element.location.index, jsxElements.length);

        if (targetIndex === jsxElements.length) {
            children.push(elementToMove);
        } else {
            const targetChild = jsxElements[targetIndex];
            const targetChildIndex = children.indexOf(targetChild);
            children.splice(targetChildIndex, 0, elementToMove);
        }
    } else {
        console.error('Element to be moved not found');
    }
}
