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
        const newClassNameAttr = t.jsxAttribute(
            t.jsxIdentifier('className'),
            t.stringLiteral(className),
        );
        openingElement.attributes.push(newClassNameAttr);
    }
}

export function replaceNodeClasses(node: t.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as t.JSXAttribute | undefined;

    if (classNameAttr) {
        classNameAttr.value = t.stringLiteral(className);
    }
}
