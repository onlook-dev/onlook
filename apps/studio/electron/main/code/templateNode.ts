import traverse from '@babel/traverse';
import type t from '@babel/types';
import { readCodeBlock } from '.';
import { parseJsxFile } from './helpers';
import type { TemplateNode, TemplateTag } from '@onlook/models/element';

export async function getTemplateNodeChild(
    parent: TemplateNode,
    child: TemplateNode,
    index: number,
): Promise<TemplateNode | undefined> {
    const codeBlock = await readCodeBlock(parent);
    const ast = parseJsxFile(codeBlock);
    let currentIndex = 0;

    if (!ast) {
        return;
    }

    let instance: TemplateNode | undefined;
    traverse(ast, {
        JSXElement(path) {
            if (!path) {
                return;
            }
            const node = path.node;
            const childName = (node.openingElement.name as t.JSXIdentifier).name;
            if (childName === child.component) {
                instance = getTemplateNode(node, parent.path, parent.startTag.start.line);
                if (currentIndex === index || index === -1) {
                    path.stop();
                }
                currentIndex++;
            }
        },
    });
    return instance;
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
    const endTag: TemplateTag | undefined = node.closingElement
        ? getTemplateTag(node.closingElement, lineOffset)
        : undefined;

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
