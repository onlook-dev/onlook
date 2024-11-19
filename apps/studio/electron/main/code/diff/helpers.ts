import generate, { type GeneratorOptions } from '@babel/generator';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import { nanoid } from 'nanoid';
import { removeSemiColonIfApplicable } from '../helpers';

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

export function addUuidToElement(element: t.JSXElement | t.JSXFragment): void {
    // TODO: Implement
    return;
}

export function addKeyToElement(element: t.JSXElement | t.JSXFragment): void {
    if (t.isJSXElement(element)) {
        const keyExists =
            element.openingElement.attributes.findIndex(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
            ) !== -1;
        if (!keyExists) {
            const keyValue = EditorAttributes.ONLOOK_MOVE_KEY_PREFIX + nanoid(4);
            const keyAttribute = t.jsxAttribute(t.jsxIdentifier('key'), t.stringLiteral(keyValue));
            element.openingElement.attributes.push(keyAttribute);
        }
    }
}

export const jsxFilter = (
    child: t.JSXElement | t.JSXExpressionContainer | t.JSXFragment | t.JSXSpreadChild | t.JSXText,
) => t.isJSXElement(child) || t.isJSXFragment(child);

export function generateCode(ast: t.File, options: GeneratorOptions, codeBlock: string): string {
    return removeSemiColonIfApplicable(generate(ast, options, codeBlock).code, codeBlock);
}
