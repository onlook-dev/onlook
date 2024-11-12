import * as t from '@babel/types';
import { twMerge } from 'tailwind-merge';

export function addClassToNode(node: t.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as t.JSXAttribute | undefined;

    if (classNameAttr) {
        if (t.isStringLiteral(classNameAttr.value)) {
            classNameAttr.value.value = twMerge(classNameAttr.value.value, className);
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

export function replaceNodeClasses(node: t.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as t.JSXAttribute | undefined;

    if (classNameAttr) {
        classNameAttr.value = t.stringLiteral(className);
    } else {
        insertAttribute(openingElement, 'className', className);
    }
}

function insertAttribute(element: t.JSXOpeningElement, attribute: string, className: string): void {
    const newClassNameAttr = t.jsxAttribute(t.jsxIdentifier(attribute), t.stringLiteral(className));
    element.attributes.push(newClassNameAttr);
}
