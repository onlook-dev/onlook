import { CodeActionType, type CodeGroup, type CodeUngroup } from '@onlook/models/actions';
import { addKeyToElement, getOidFromJsxElement, jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';
import { type t as T, type NodePath, types as t } from '../packages';

export function groupElementsInNode(path: NodePath<T.JSXElement>, element: CodeGroup): void {
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

    const insertIndex = Math.min(...targetChildren.map((c) => jsxElements.indexOf(c)));

    targetChildren.forEach((targetChild) => {
        removeElementAtIndex(jsxElements.indexOf(targetChild), jsxElements, children);
    });

    const container = createInsertedElement({
        type: CodeActionType.INSERT,
        textContent: null,
        pasteParams: {
            oid: element.container.oid,
            domId: element.container.domId,
        },
        codeBlock: null,
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

    addKeyToElement(container);
    insertAtIndex(path, container, insertIndex);

    jsxElements.forEach((el) => {
        addKeyToElement(el);
    });
    path.stop();
}

export function ungroupElementsInNode(path: NodePath<T.JSXElement>, element: CodeUngroup): void {
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);

    const container = jsxElements.find((el) => {
        if (!t.isJSXElement(el)) {
            return false;
        }
        const oid = getOidFromJsxElement(el.openingElement);
        if (!oid) {
            throw new Error('Element has no oid');
        }
        return oid === element.container.oid;
    });

    if (!container || !t.isJSXElement(container)) {
        throw new Error('Container element not found');
    }

    const containerIndex = children.indexOf(container);

    const containerChildren = container.children.filter(jsxFilter);

    // Add each child at the container's position
    containerChildren.forEach((child, index) => {
        addKeyToElement(child, true);
        children.splice(containerIndex + index, 0, child);
    });

    // Remove the container after spreading its children
    children.splice(containerIndex + containerChildren.length, 1);

    path.stop();
}
