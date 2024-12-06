import generate, { type GeneratorOptions } from '@babel/generator';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import { nanoid } from 'nanoid/non-secure';

export function getOidFromJsxElement(element: t.JSXOpeningElement): string | null {
    const attribute = element.attributes.find(
        (attr): attr is t.JSXAttribute =>
            t.isJSXAttribute(attr) && attr.name.name === EditorAttributes.DATA_ONLOOK_ID,
    );

    if (!attribute || !attribute.value) {
        return null;
    }

    if (t.isStringLiteral(attribute.value)) {
        return attribute.value.value;
    }

    return null;
}

export function addParamToElement(
    element: t.JSXElement | t.JSXFragment,
    key: string,
    value: string,
    replace = false,
): void {
    if (!t.isJSXElement(element)) {
        console.error('addParamToElement: element is not a JSXElement', element);
        return;
    }
    const paramAttribute = t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value));
    const existingIndex = element.openingElement.attributes.findIndex(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === key,
    );

    if (existingIndex !== -1 && !replace) {
        return;
    }

    // Replace existing param or add new one
    if (existingIndex !== -1) {
        element.openingElement.attributes.splice(existingIndex, 1, paramAttribute);
    } else {
        element.openingElement.attributes.push(paramAttribute);
    }
}

export function addKeyToElement(element: t.JSXElement | t.JSXFragment, replace = false): void {
    if (!t.isJSXElement(element)) {
        console.error('addKeyToElement: element is not a JSXElement', element);
        return;
    }

    const keyIndex = element.openingElement.attributes.findIndex(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
    );

    if (keyIndex !== -1 && !replace) {
        return;
    }

    const keyValue = EditorAttributes.ONLOOK_MOVE_KEY_PREFIX + nanoid(4);
    const keyAttribute = t.jsxAttribute(t.jsxIdentifier('key'), t.stringLiteral(keyValue));

    // Replace existing key or add new one
    if (keyIndex !== -1) {
        element.openingElement.attributes.splice(keyIndex, 1, keyAttribute);
    } else {
        element.openingElement.attributes.push(keyAttribute);
    }
}

export const jsxFilter = (
    child: t.JSXElement | t.JSXExpressionContainer | t.JSXFragment | t.JSXSpreadChild | t.JSXText,
) => t.isJSXElement(child) || t.isJSXFragment(child);

export function generateCode(ast: t.File, options: GeneratorOptions, codeBlock: string): string {
    return generate(ast, options, codeBlock).code;
}
