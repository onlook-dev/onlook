import traverse from '@babel/traverse';
import type t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import type { TemplateNode, TemplateTag } from '@onlook/models/element';
import { readCodeBlock } from '.';
import { parseJsxFile } from './helpers';

export async function getTemplateNodeChild(
    parent: TemplateNode,
    child: TemplateNode,
    index: number,
): Promise<{ instanceId: string; component: string } | null> {
    const codeBlock = await readCodeBlock(parent);
    if (codeBlock == null) {
        console.error(`Failed to read code block: ${parent.path}`);
        return null;
    }
    const ast = parseJsxFile(codeBlock);
    let currentIndex = 0;

    if (!ast) {
        return null;
    }

    let res: { instanceId: string; component: string } | null = null;
    traverse(ast, {
        JSXElement(path) {
            if (!path) {
                return;
            }
            const node = path.node;
            const childName = (node.openingElement.name as t.JSXIdentifier).name;
            if (childName === child.component) {
                const instanceId = getOidFromNode(node);
                if (instanceId) {
                    res = { instanceId, component: child.component };
                }
                if (currentIndex === index || index === -1) {
                    path.stop();
                }
                currentIndex++;
            }
        },
    });
    return res;
}

function getOidFromNode(node: t.JSXElement): string | null {
    const attr = node.openingElement.attributes.find(
        (attr): attr is t.JSXAttribute =>
            'name' in attr &&
            'name' in attr.name &&
            attr.name.name === EditorAttributes.DATA_ONLOOK_ID,
    );
    if (!attr) {
        return null;
    }
    if (attr.value?.type === 'StringLiteral') {
        return attr.value.value;
    }
    return null;
}

export function getTemplateNode(
    node: t.JSXElement,
    path: string,
    lineOffset: number,
): TemplateNode {
    if (!node.openingElement.loc) {
        throw new Error('No location found for opening element');
    }

    const name = (node.openingElement.name as t.JSXIdentifier).name;
    const startTag: TemplateTag = getTemplateTag(node.openingElement, lineOffset);
    const endTag: TemplateTag | null = node.closingElement
        ? getTemplateTag(node.closingElement, lineOffset)
        : null;

    const template: TemplateNode = {
        path,
        startTag,
        endTag,
        component: name,
    };
    return template;
}

function getTemplateTag(
    element: t.JSXOpeningElement | t.JSXClosingElement,
    lineOffset: number,
): TemplateTag {
    if (!element.loc) {
        throw new Error('No location found for element');
    }

    return {
        start: {
            line: element.loc.start.line + lineOffset - 1,
            column: element.loc.start.column + 1,
        },
        end: {
            line: element.loc.end.line + lineOffset - 1,
            column: element.loc.end.column,
        },
    };
}
