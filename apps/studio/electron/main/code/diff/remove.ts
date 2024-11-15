import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { addKeyToElement } from './helpers';
import { assertNever } from '/common/helpers';
import { InsertPos } from '@onlook/models/editor';
import type { CodeAction } from '@onlook/models/actions';

export function removeElementFromNode(path: NodePath<t.JSXElement>, element: CodeAction): void {
    const children = path.node.children;

    children.forEach((child, index) => {
        if (t.isJSXElement(child)) {
            addKeyToElement(child);
        }
    });

    switch (element.location.position) {
        case InsertPos.INDEX: {
            let currentStaticCount = -1;
            let targetChildIndex = -1;

            // Find occurrence count in children
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (t.isJSXElement(child)) {
                    const keyAttribute = child.openingElement.attributes.find(
                        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
                    );

                    if (keyAttribute && t.isJSXAttribute(keyAttribute)) {
                        const keyValue = (keyAttribute.value as any)?.value;
                        if (
                            keyValue &&
                            typeof keyValue === 'string' &&
                            keyValue.startsWith('onlook-')
                        ) {
                            currentStaticCount++;

                            if (currentStaticCount === element.location.staticIndex) {
                                targetChildIndex = i;
                                break;
                            }
                        }
                    }
                }
            }

            if (targetChildIndex !== -1) {
                children.splice(targetChildIndex, 1);
            } else {
                console.error(
                    'Could not find static element at index:',
                    element.location.staticIndex,
                );
            }
            break;
        }
        case InsertPos.APPEND: {
            // Find last element with onlook- key
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i];
                if (t.isJSXElement(child)) {
                    const keyAttr = child.openingElement.attributes.find(
                        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
                    );
                    const keyValue = (keyAttr as any)?.value?.value;
                    if (
                        keyValue &&
                        typeof keyValue === 'string' &&
                        keyValue.startsWith('onlook-')
                    ) {
                        children.splice(i, 1);
                        break;
                    }
                }
            }
            break;
        }
        case InsertPos.PREPEND: {
            // Find first element with onlook- key
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (t.isJSXElement(child)) {
                    const keyAttr = child.openingElement.attributes.find(
                        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
                    );
                    const keyValue = (keyAttr as any)?.value?.value;
                    if (
                        keyValue &&
                        typeof keyValue === 'string' &&
                        keyValue.startsWith('onlook-')
                    ) {
                        children.splice(i, 1);
                        break;
                    }
                }
            }
            break;
        }
        default: {
            console.error(`Unhandled position: ${element.location.position}`);
            assertNever(element.location.position);
        }
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
