import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { jsxFilter } from './helpers';
import { assertNever } from '/common/helpers';
import { InsertPos } from '@onlook/models/editor';
import type { CodeAction } from '@onlook/models/actions';

export function removeElementFromNode(path: NodePath<t.JSXElement>, element: CodeAction): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);

    switch (element.location.position) {
        case InsertPos.INDEX:
            removeElementAtIndex(element.location.index, jsxElements, children);
            break;
        case InsertPos.APPEND:
            removeElementAtIndex(jsxElements.length - 1, jsxElements, children);
            break;
        case InsertPos.PREPEND:
            removeElementAtIndex(0, jsxElements, children);
            break;
        default:
            console.error(`Unhandled position: ${element.location.position}`);
            assertNever(element.location.position);
    }
    path.stop();
}

export function removeElementAtIndex(
    index: number,
    jsxElements: Array<t.JSXElement | t.JSXFragment>,
    children: t.Node[],
) {
    if (index >= 0 && index < jsxElements.length) {
        const elementToRemove = jsxElements[index];
        const indexInChildren = children.indexOf(elementToRemove);

        if (indexInChildren !== -1) {
            children.splice(indexInChildren, 1);
        } else {
            console.error('Element to be removed not found in children');
        }
    } else {
        console.error('Invalid element index for removal');
    }
}
