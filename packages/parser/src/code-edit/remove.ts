import type { CodeRemove } from '@onlook/models/actions';
import { type NodePath, type t as T } from '../packages';
import { addKeyToElement, jsxFilter } from './helpers';

export function removeElementFromNode(path: NodePath<T.JSXElement>, element: CodeRemove): void {
    const parentPath = path.parentPath;

    if (!parentPath) {
        console.error('No parent path found');
        return;
    }

    const siblings = (parentPath.node as T.JSXElement).children?.filter(jsxFilter) || [];
    path.remove();

    siblings.forEach((sibling) => {
        addKeyToElement(sibling);
    });

    path.stop();
}

export function removeElementAtIndex(
    index: number,
    jsxElements: Array<T.JSXElement | T.JSXFragment>,
    children: T.Node[],
) {
    if (index >= 0 && index < jsxElements.length) {
        const elementToRemove = jsxElements[index];
        if (!elementToRemove) {
            console.error('Element to be removed not found');
            return;
        }
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
