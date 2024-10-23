import * as t from '@babel/types';
import { nanoid } from 'nanoid';
import { EditorAttributes } from '/common/constants';
import { CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

export function createHashedTemplateToCodeDiff(
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): Map<string, CodeDiffRequest> {
    const hashedTemplateToCodeDiff = new Map<string, CodeDiffRequest>();
    for (const [templateNode, codeDiffRequest] of templateToCodeDiff) {
        const hashedKey = hashTemplateNode(templateNode);
        hashedTemplateToCodeDiff.set(hashedKey, codeDiffRequest);
    }
    return hashedTemplateToCodeDiff;
}

export function hashTemplateNode(node: TemplateNode): string {
    return `${node.path}:${node.startTag.start.line}:${node.startTag.start.column}`;
}

export function addKeyToElement(element: t.JSXElement | t.JSXFragment): void {
    if (t.isJSXElement(element)) {
        const keyExists =
            element.openingElement.attributes.findIndex(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === 'key',
            ) !== -1;
        if (!keyExists) {
            const keyValue = EditorAttributes.ONLOOK_MOVE_KEY_PREFIX + nanoid();
            const keyAttribute = t.jsxAttribute(t.jsxIdentifier('key'), t.stringLiteral(keyValue));
            element.openingElement.attributes.push(keyAttribute);
        }
    }
}

export function addUuidToElement(element: t.JSXElement | t.JSXFragment, uuid: string): void {
    if (t.isJSXElement(element)) {
        const keyExists =
            element.openingElement.attributes.findIndex(
                (attr) =>
                    t.isJSXAttribute(attr) &&
                    (attr.name.name === EditorAttributes.DATA_ONLOOK_UNIQUE_ID ||
                        attr.name.name === EditorAttributes.DATA_ONLOOK_TEMP_ID),
            ) !== -1;
        if (!keyExists) {
            const keyAttribute = t.jsxAttribute(
                t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_TEMP_ID),
                t.stringLiteral(uuid),
            );
            element.openingElement.attributes.push(keyAttribute);
        }
    }
}

export const jsxFilter = (
    child: t.JSXElement | t.JSXExpressionContainer | t.JSXFragment | t.JSXSpreadChild | t.JSXText,
) => t.isJSXElement(child) || t.isJSXFragment(child);
