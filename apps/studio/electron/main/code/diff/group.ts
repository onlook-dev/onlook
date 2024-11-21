import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { CodeActionType, type CodeGroup, type CodeUngroup } from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import { addKeyToElement, addParamToElement, getOidFromJsxElement, jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);

    const targetOids = element.children.map((c) => c.oid);
    const targetChildren = jsxElements.filter((el) => {
        if (!t.isJSXElement(el)) {
            return false;
        }
        const oid = getOidFromJsxElement(el.openingElement);
        if (!oid) {
            throw new Error('Element has no oid');
        }
        return targetOids.includes(oid);
    });

    targetChildren.forEach((targetChild) => {
        removeElementAtIndex(jsxElements.indexOf(targetChild), jsxElements, children);
    });

    const insertIndex = Math.min(...targetChildren.map((c) => children.indexOf(c)));

    const container = createInsertedElement({
        type: CodeActionType.INSERT,
        textContent: null,
        pasteParams: {
            oid: element.container.oid,
            domId: element.container.domId,
            codeBlock: null,
        },
        children: [],
        oid: element.container.oid,
        tagName: element.container.tagName,
        attributes: {},
        location: {
            type: 'index',
            targetDomId: element.container.domId,
            targetOid: element.container.oid,
            index: insertIndex,
            originalIndex: insertIndex,
        },
    });
    container.children = targetChildren;

    insertAtIndex(path, container, insertIndex);
    path.stop();
}

export function ungroupElementsInNode(path: NodePath<t.JSXElement>, element: CodeUngroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const containerIndex = element.location.index;
    const container = jsxElements[containerIndex] as t.JSXElement;

    if (!t.isJSXElement(container)) {
        throw new Error('Container element not found');
    }

    const elementsToUngroup: Array<t.JSXElement | t.JSXFragment> =
        container.children.filter(jsxFilter);
    removeElementAtIndex(containerIndex, jsxElements, children);

    const sortedTargets = [...element.targets].sort((a, b) => a.index - b.index);
    sortedTargets.forEach((target, i) => {
        const elementToInsert = elementsToUngroup[i];
        if (elementToInsert) {
            addParamToElement(elementToInsert, EditorAttributes.DATA_ONLOOK_ID, target.oid);
            addKeyToElement(elementToInsert);
            insertAtIndex(path, elementToInsert, target.index);
        }
    });

    path.stop();
}
