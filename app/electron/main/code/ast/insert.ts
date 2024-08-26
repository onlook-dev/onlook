import traverse from '@babel/traverse';
import t from '@babel/types';
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
                case 'append':
                    path.node.children.push(newElement);
                    break;
                case 'prepend':
                    path.node.children.unshift(newElement);
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
