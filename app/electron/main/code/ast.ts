import traverse from '@babel/traverse';
import t from '@babel/types';
import { readCodeBlock } from '.';
import { parseJsx } from './babel';
import { readFile } from './files';
import { TemplateNode, TemplateTag } from '/common/models/element/templateNode';

export async function getTemplateNodeAst(
    templateNode: TemplateNode,
): Promise<t.JSXElement | undefined> {
    const codeBlock = await readFile(templateNode.path);
    const ast = parseJsx(codeBlock);
    if (!ast) {
        return;
    }
    let target: t.JSXElement | undefined;

    traverse(ast, {
        JSXElement(path) {
            // Get matching node to templateNode
            const node = path.node;
            if (node.openingElement.loc) {
                const start = node.openingElement.loc.start;
                if (
                    start.line === templateNode.startTag.start.line &&
                    start.column === templateNode.startTag.start.column - 1
                ) {
                    target = node;
                    path.stop();
                }
            }
        },
    });
    return target;
}

export async function getTemplateNodeChild(
    parent: TemplateNode,
    child: TemplateNode,
    index: number,
): Promise<TemplateNode | undefined> {
    const codeBlock = await readCodeBlock(parent);
    const ast = parseJsx(codeBlock);
    if (!ast) {
        return;
    }

    let instance: TemplateNode | undefined;

    traverse(ast, {
        JSXElement(path) {
            // Get matching node to templateNode
            if (!path) {
                return;
            }
            const node = path.node;
            const childName = (node.openingElement.name as t.JSXIdentifier).name;
            if (childName === child.component) {
                instance = getTemplateNode(node, parent.path, parent.startTag.start.line);
                path.stop();
            }
        },
    });
    return instance;
}

function getTemplateNode(node: t.JSXElement, path: string, lineOffset: number): TemplateNode {
    if (!node.openingElement.loc) {
        throw new Error('No location found for opening element');
    }

    const name = (node.openingElement.name as t.JSXIdentifier).name;

    const startTag: TemplateTag = {
        start: {
            line: node.openingElement.loc.start.line + lineOffset - 1,
            column: node.openingElement.loc.start.column + 1,
        },
        end: {
            line: node.openingElement.loc.end.line + lineOffset - 1,
            column: node.openingElement.loc.end.column + 1,
        },
    };
    const endTag: TemplateTag = node.closingElement?.loc
        ? {
              start: {
                  line: node.closingElement.loc.start.line + lineOffset - 1,
                  column: node.closingElement.loc.start.column + 1,
              },
              end: {
                  line: node.closingElement.loc.end.line + lineOffset - 1,
                  column: node.closingElement.loc.end.column + 1,
              },
          }
        : startTag;

    const template: TemplateNode = {
        path,
        startTag,
        endTag,
        component: name,
    };

    return template;
}
