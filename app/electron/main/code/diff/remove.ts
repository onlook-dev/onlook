import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { InsertPos } from '/common/models';
import { CodeAction } from '/common/models/actions/code';

export function removeElementFromNode(path: NodePath<t.JSXElement>, element: CodeAction): void {
    const children = path.node.children;
    const jsxElements = children.filter(
        (child) => t.isJSXElement(child) || t.isJSXFragment(child),
    ) as Array<t.JSXElement | t.JSXFragment>;
    let elementToRemoveIndex: number;

    switch (element.location.position) {
        case InsertPos.INDEX:
            if (element.location.index !== -1) {
                elementToRemoveIndex = Math.min(element.location.index, jsxElements.length - 1);
            } else {
                console.error('Invalid index: undefined');
                return;
            }
            break;
        case InsertPos.APPEND:
            elementToRemoveIndex = jsxElements.length - 1;
            break;
        case InsertPos.PREPEND:
            elementToRemoveIndex = 0;
            break;
        default:
            console.error(`Unhandled position: ${element.location.position}`);
            return;
    }

    if (elementToRemoveIndex >= 0 && elementToRemoveIndex < jsxElements.length) {
        const elementToRemove = jsxElements[elementToRemoveIndex];
        const indexInChildren = children.indexOf(elementToRemove);

        if (indexInChildren !== -1) {
            children.splice(indexInChildren, 1);
        } else {
            console.error('Element to be removed not found in children');
        }
    } else {
        console.error('Invalid element index for removal');
    }

    path.stop();
}
