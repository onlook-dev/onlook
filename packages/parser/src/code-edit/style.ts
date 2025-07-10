import { customTwMerge } from '@onlook/utility';
import { type t as T, types as t } from '../packages';

export function addClassToNode(node: T.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as T.JSXAttribute | undefined;

    if (classNameAttr) {
        if (t.isStringLiteral(classNameAttr.value)) {
            classNameAttr.value.value = customTwMerge(classNameAttr.value.value, className);
        } else if (
            t.isJSXExpressionContainer(classNameAttr.value) &&
            t.isCallExpression(classNameAttr.value.expression)
        ) {
            classNameAttr.value.expression.arguments.push(t.stringLiteral(className));
        }
    } else {
        insertAttribute(openingElement, 'className', className);
    }
}

export function replaceNodeClasses(node: T.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as T.JSXAttribute | undefined;

    if (classNameAttr) {
        classNameAttr.value = t.stringLiteral(className);
    } else {
        insertAttribute(openingElement, 'className', className);
    }
}

function insertAttribute(element: T.JSXOpeningElement, attribute: string, className: string): void {
    const newClassNameAttr = t.jsxAttribute(t.jsxIdentifier(attribute), t.stringLiteral(className));
    element.attributes.push(newClassNameAttr);
}

export function updateNodeProp(node: T.JSXElement, key: string, value: any): void {
    const openingElement = node.openingElement;
    const existingAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === key,
    ) as T.JSXAttribute | undefined;

    if (existingAttr) {
        if (typeof value === 'boolean') {
            existingAttr.value = t.jsxExpressionContainer(t.booleanLiteral(value));
        } else if (typeof value === 'string') {
            existingAttr.value = t.stringLiteral(value);
        } else if (typeof value === 'function') {
            existingAttr.value = t.jsxExpressionContainer(
                t.arrowFunctionExpression([], t.blockStatement([])),
            );
        } else {
            existingAttr.value = t.jsxExpressionContainer(t.identifier(value.toString()));
        }
    } else {
        let newAttr: T.JSXAttribute;
        if (typeof value === 'boolean') {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.booleanLiteral(value)),
            );
        } else if (typeof value === 'string') {
            newAttr = t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value));
        } else if (typeof value === 'function') {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.arrowFunctionExpression([], t.blockStatement([]))),
            );
        } else {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.identifier(value.toString())),
            );
        }

        openingElement.attributes.push(newAttr);
    }
}
