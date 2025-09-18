import { EditorAttributes } from '@onlook/constants';
import type { CodeInsert, PasteParams } from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { type NodePath, type t as T, types as t } from '../packages';
import { getAstFromCodeblock } from '../parse';
import { addKeyToElement, addParamToElement, jsxFilter } from './helpers';

export function insertElementToNode(path: NodePath<T.JSXElement>, element: CodeInsert): void {
    const newElement = createInsertedElement(element);

    switch (element.location.type) {
        case 'append':
            path.node.children.push(newElement);
            break;
        case 'prepend':
            path.node.children.unshift(newElement);
            break;
        case 'index':
            insertAtIndex(path, newElement, element.location.index);
            break;
        default:
            console.error(`Unhandled position: ${element.location}`);
            path.node.children.push(newElement);
            assertNever(element.location);
    }

    path.stop();
}

export function createInsertedElement(insertedChild: CodeInsert): T.JSXElement {
    let element: T.JSXElement;
    if (insertedChild.codeBlock) {
        element =
            getAstFromCodeblock(insertedChild.codeBlock, true) || createJSXElement(insertedChild);
        addParamToElement(element, EditorAttributes.DATA_ONLOOK_ID, insertedChild.oid);
    } else {
        element = createJSXElement(insertedChild);
    }
    if (insertedChild.pasteParams) {
        addPasteParamsToElement(element, insertedChild.pasteParams);
    }
    addKeyToElement(element);
    return element;
}

function addPasteParamsToElement(element: T.JSXElement, pasteParams: PasteParams): void {
    addParamToElement(element, EditorAttributes.DATA_ONLOOK_ID, pasteParams.oid);
}

function createJSXElement(insertedChild: CodeInsert): T.JSXElement {
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

    const children: Array<T.JSXElement | T.JSXExpressionContainer | T.JSXText> = [];

    // Add textContent as the first child if it exists
    if (insertedChild.textContent) {
        children.push(t.jsxText(insertedChild.textContent));
    }

    // Add other children after the textContent
    children.push(...(insertedChild.children || []).map(createJSXElement));

    return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}

export function insertAtIndex(
    path: NodePath<T.JSXElement>,
    newElement: T.JSXElement | T.JSXFragment,
    index: number,
): void {
    if (index !== -1) {
        const jsxElements = path.node.children.filter(jsxFilter);
        const targetIndex = Math.min(index, jsxElements.length);
        if (targetIndex >= path.node.children.length) {
            path.node.children.push(newElement);
        } else {
            const targetChild = jsxElements[targetIndex];
            if (!targetChild) {
                console.error('Target child not found');
                path.node.children.push(newElement);
                return;
            }
            const targetChildIndex = path.node.children.indexOf(targetChild);
            path.node.children.splice(targetChildIndex, 0, newElement);
        }
    } else {
        console.error('Invalid index:', index);
        path.node.children.push(newElement);
    }
}
