import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { addKeyToElement, jsxFilter } from './helpers';
import { CodeRemove } from '@onlook/models';

export function removeElementFromNode(path: NodePath<t.JSXElement>, element: CodeRemove): void {
    const parentPath = path.parentPath;

    if (!parentPath) {
        console.error('No parent path found');
        return;
    }

    const siblings = (parentPath.node as t.JSXElement).children?.filter(jsxFilter) || [];
    path.remove();

    siblings.forEach((sibling) => {
        addKeyToElement(sibling);
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
