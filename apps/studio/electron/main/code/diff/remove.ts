import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import type { CodeRemove } from '@onlook/models/actions';
import { addKeyToElement, jsxFilter } from './helpers';
import { assertNever } from '/common/helpers';

export function removeElementFromNode(path: NodePath<t.JSXElement>, element: CodeRemove): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);

    switch (element.location.type) {
        case 'index':
            removeElementAtIndex(element.location.index, jsxElements, children);
            break;
        case 'append':
            removeElementAtIndex(jsxElements.length - 1, jsxElements, children);
            break;
        case 'prepend':
            removeElementAtIndex(0, jsxElements, children);
            break;
        default:
            console.error(`Unhandled position: ${element.location}`);
            assertNever(element.location);
    }
    jsxElements.forEach((element) => {
        addKeyToElement(element);
    });

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
