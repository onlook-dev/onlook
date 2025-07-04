import { CoreElementType, DynamicType, type TemplateNode } from '@onlook/models';
import { isReactFragment } from '../helpers';
import { getExistingOid } from '../ids';
import { type NodePath, type t as T, types as t, traverse } from '../packages';
import { createTemplateNode } from './helpers';
import { getOidFromJsxElement } from '../code-edit/helpers';
import { getAstFromContent } from '../parse';

export function createTemplateNodeMap(ast: T.File, filename: string): Map<string, TemplateNode> {
    const mapping: Map<string, TemplateNode> = new Map();
    const componentStack: string[] = [];
    const dynamicTypeStack: DynamicType[] = [];

    traverse(ast, {
        FunctionDeclaration: {
            enter(path) {
                if (!path.node.id) {
                    return;
                }
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        ClassDeclaration: {
            enter(path) {
                if (!path.node.id) {
                    return;
                }
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        VariableDeclaration: {
            enter(path) {
                if (
                    !path.node.declarations[0]?.id ||
                    !t.isIdentifier(path.node.declarations[0].id)
                ) {
                    return;
                }
                componentStack.push(path.node.declarations[0].id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        CallExpression: {
            enter(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.push(DynamicType.ARRAY);
                }
            },
            exit(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.pop();
                }
            },
        },
        ConditionalExpression: {
            enter() {
                dynamicTypeStack.push(DynamicType.CONDITIONAL);
            },
            exit() {
                dynamicTypeStack.pop();
            },
        },
        LogicalExpression: {
            enter(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    dynamicTypeStack.push(DynamicType.CONDITIONAL);
                }
            },
            exit(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    dynamicTypeStack.pop();
                }
            },
        },
        JSXElement(path) {
            if (isReactFragment(path.node.openingElement)) {
                return;
            }

            const existingOid = getExistingOid(path.node.openingElement.attributes);
            if (!existingOid) {
                return;
            }

            const oid = existingOid.value;
            const dynamicType = getDynamicTypeInfo(path);
            const coreElementType = getCoreElementInfo(path);

            const newTemplateNode = createTemplateNode(
                path,
                filename,
                componentStack,
                dynamicType,
                coreElementType,
            );

            mapping.set(oid, newTemplateNode);
        },
    });
    return mapping;
}

export function getDynamicTypeInfo(path: NodePath<T.JSXElement>): DynamicType | null {
    const parent = path.parent;
    const grandParent = path.parentPath?.parent;

    // Check for conditional root element
    const isConditionalRoot =
        (t.isConditionalExpression(parent) || t.isLogicalExpression(parent)) &&
        t.isJSXExpressionContainer(grandParent);

    // Check for array map root element
    const isArrayMapRoot =
        t.isArrowFunctionExpression(parent) ||
        (t.isJSXFragment(parent) && path.parentPath?.parentPath?.isArrowFunctionExpression());

    const dynamicType = isConditionalRoot
        ? DynamicType.CONDITIONAL
        : isArrayMapRoot
          ? DynamicType.ARRAY
          : undefined;

    return dynamicType ?? null;
}

export function getCoreElementInfo(path: NodePath<T.JSXElement>): CoreElementType | null {
    const parent = path.parent;

    const isComponentRoot = t.isReturnStatement(parent) || t.isArrowFunctionExpression(parent);

    const isBodyTag =
        t.isJSXIdentifier(path.node.openingElement.name) &&
        path.node.openingElement.name.name.toLocaleLowerCase() === 'body';

    const coreElementType = isComponentRoot
        ? CoreElementType.COMPONENT_ROOT
        : isBodyTag
          ? CoreElementType.BODY_TAG
          : undefined;

    return coreElementType ?? null;
}

export async function getContentFromTemplateNode(
    templateNode: TemplateNode,
    content: string,
): Promise<string | null> {
    try {
        const filePath = templateNode.path;

        const startTag = templateNode.startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;

        const endTag = templateNode.endTag || startTag;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        if (content == null) {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
        const lines = content.split('\n');

        const selectedText = lines
            .slice(startRow - 1, endRow)
            .map((line: string, index: number, array: string[]) => {
                if (index === 0 && array.length === 1) {
                    // Only one line
                    return line.substring(startColumn - 1, endColumn);
                } else if (index === 0) {
                    // First line of multiple
                    return line.substring(startColumn - 1);
                } else if (index === array.length - 1) {
                    // Last line
                    return line.substring(0, endColumn);
                }
                // Full lines in between
                return line;
            })
            .join('\n');

        return selectedText;
    } catch (error: any) {
        console.error('Error reading range from file:', error);
        throw error;
    }
}

export function isNodeElementArray(node: T.CallExpression): boolean {
    return (
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property) &&
        node.callee.property.name === 'map'
    );
}

export async function getTemplateNodeChild(
    parentContent: string,
    child: TemplateNode,
    index: number,
): Promise<{ instanceId: string; component: string } | null> {
    if (parentContent == null) {
        console.error(`Failed to read code block: ${parentContent}`);
        return null;
    }
    const ast = getAstFromContent(parentContent);
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
            const childName = (node.openingElement.name as T.JSXIdentifier).name;
            if (childName === child.component) {
                const instanceId = getOidFromJsxElement(node.openingElement);
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
