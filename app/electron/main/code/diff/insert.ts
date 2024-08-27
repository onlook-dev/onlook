import traverse from '@babel/traverse';
import t from '@babel/types';
import { InsertPos } from '/common/models';
import { InsertedChild, InsertedElement } from '/common/models/element/insert';

export function insertElementToAst(ast: t.File, element: InsertedElement) {
    let processed = false;

    traverse(ast, {
        JSXElement(path) {
            if (processed) {
                return;
            }
            const newElement = createJSXElement(element);

            switch (element.location.position) {
                case InsertPos.APPEND:
                    path.node.children.push(newElement);
                    break;
                case InsertPos.PREPEND:
                    path.node.children.unshift(newElement);
                    break;
                case InsertPos.INDEX:
                    handleIndexPosition(path, element, newElement);
                    break;
                default:
                    console.error(`Unhandled position: ${element.location.position}`);
                    path.node.children.push(newElement);
                    break;
            }

            path.stop();
            processed = true;
        },
    });
}

function handleIndexPosition(path: any, element: InsertedElement, newElement: t.JSXElement) {
    if (
        element.location.index !== undefined &&
        element.location.index < path.node.children.length
    ) {
        path.node.children.splice(element.location.index + 1, 0, newElement);
    } else {
        console.error(`Invalid index: ${element.location.index}`);
        path.node.children.push(newElement);
    }
}

function createJSXElement(insertedChild: InsertedChild): t.JSXElement {
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

    const children = (insertedChild.children || []).map(createJSXElement);

    return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}
