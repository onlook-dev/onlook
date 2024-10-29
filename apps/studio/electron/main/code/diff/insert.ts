import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { parseJsxCodeBlock } from '../helpers';
import { addKeyToElement, addUuidToElement, jsxFilter } from './helpers';
import { assertNever } from '/common/helpers';
import { InsertPos } from '/common/models';
import type { CodeInsert } from '/common/models/actions/code';

export function insertElementToNode(path: NodePath<t.JSXElement>, element: CodeInsert): void {
    const newElement = createInsertedElement(element);

    switch (element.location.position) {
        case InsertPos.APPEND:
            path.node.children.push(newElement);
            break;
        case InsertPos.PREPEND:
            path.node.children.unshift(newElement);
            break;
        case InsertPos.INDEX:
            insertAtIndex(path, newElement, element.location.index);
            break;
        default:
            console.error(`Unhandled position: ${element.location.position}`);
            path.node.children.push(newElement);
            assertNever(element.location.position);
    }

    path.stop();
}

export function createInsertedElement(insertedChild: CodeInsert): t.JSXElement {
    let element: t.JSXElement;
    if (insertedChild.codeBlock) {
        element = parseJsxCodeBlock(insertedChild.codeBlock) || createJSXElement(insertedChild);
    } else {
        element = createJSXElement(insertedChild);
    }
    addUuidToElement(element, insertedChild.uuid);
    addKeyToElement(element);
    return element;
}

function createJSXElement(insertedChild: CodeInsert): t.JSXElement {
    const attributes = Object.entries(insertedChild.attributes || {}).map(([key, value]) =>
        t.jsxAttribute(
            t.jsxIdentifier(key),
            typeof value === 'string'
                ? t.stringLiteral(value)
                : t.jsxExpressionContainer(t.stringLiteral(JSON.stringify(value))),
        ),
    );

    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(
        insertedChild.tagName.toLowerCase(),
    );

    const openingElement = t.jsxOpeningElement(
        t.jsxIdentifier(insertedChild.tagName),
        attributes,
        isSelfClosing,
    );

    let closingElement = null;
    if (!isSelfClosing) {
        closingElement = t.jsxClosingElement(t.jsxIdentifier(insertedChild.tagName));
    }

    const children: Array<t.JSXElement | t.JSXExpressionContainer | t.JSXText> = [];

    // Add textContent as the first child if it exists
    if (insertedChild.textContent) {
        children.push(t.jsxText(insertedChild.textContent));
    }

    // Add other children after the textContent
    children.push(...(insertedChild.children || []).map(createJSXElement));

    return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}

export function insertAtIndex(
    path: NodePath<t.JSXElement>,
    newElement: t.JSXElement | t.JSXFragment,
    index: number,
): void {
    if (index !== -1) {
        const jsxElements = path.node.children.filter(jsxFilter);

        const targetIndex = Math.min(index, jsxElements.length);

        if (targetIndex === path.node.children.length) {
            path.node.children.push(newElement);
        } else {
            const targetChild = jsxElements[targetIndex];
            const targetChildIndex = path.node.children.indexOf(targetChild);
            path.node.children.splice(targetChildIndex, 0, newElement);
        }
    } else {
        console.error('Invalid index: undefined');
        path.node.children.push(newElement);
    }
}
