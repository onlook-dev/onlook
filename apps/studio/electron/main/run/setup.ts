import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import type { DynamicType, TemplateNode } from '@onlook/models/element';
import { generateCode } from '../code/diff/helpers';
import { formatContent, readFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';
import { generateCodeOptions, generateId, getTemplateNode, isReactFragment } from './helpers';

export async function getFileWithIds(filePath: string): Promise<string | null> {
    const content = await readFile(filePath);
    const ast = parseJsxFile(content);
    if (!ast) {
        console.error(`Failed to parse file: ${filePath}`);
        return null;
    }
    addIdsToAst(ast);
    const generated = generateCode(ast, generateCodeOptions, content);
    const formatted = await formatContent(filePath, generated);
    return formatted;
}

function addIdsToAst(ast: t.File) {
    const ids: Set<string> = new Set();

    traverse(ast, {
        JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes;
            const existingAttrIndex = attributes.findIndex(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (existingAttrIndex !== -1) {
                const existingId = (attributes[existingAttrIndex] as any).value.value;
                if (ids.has(existingId)) {
                    const newId = generateId();
                    (attributes[existingAttrIndex] as any).value.value = newId;
                    ids.add(newId);
                } else {
                    ids.add(existingId);
                }
                return;
            }

            const elementId = generateId();
            const oid = t.jSXAttribute(
                t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.stringLiteral(elementId),
            );
            attributes.push(oid);
            ids.add(elementId);
        },
    });
}

export function createMappingFromContent(content: string, filename: string) {
    const ast = parseJsxFile(content);
    if (!ast) {
        return null;
    }
    return createMapping(ast, filename);
}

function createMapping(ast: t.File, filename: string): Record<string, TemplateNode> | null {
    const mapping: Record<string, TemplateNode> = {};
    const componentStack: string[] = [];
    const dynamicTypeStack: DynamicType[] = [];

    traverse(ast, {
        FunctionDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        ClassDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        VariableDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.declarations[0].id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        CallExpression: {
            enter(path) {
                if (
                    t.isMemberExpression(path.node.callee) &&
                    t.isIdentifier(path.node.callee.property) &&
                    path.node.callee.property.name === 'map'
                ) {
                    dynamicTypeStack.push('array');
                }
            },
            exit(path) {
                if (
                    t.isMemberExpression(path.node.callee) &&
                    t.isIdentifier(path.node.callee.property) &&
                    path.node.callee.property.name === 'map'
                ) {
                    dynamicTypeStack.pop();
                }
            },
        },
        JSXElement(path: any) {
            if (isReactFragment(path.node.openingElement)) {
                return;
            }

            const attributes = path.node.openingElement.attributes;
            const idAttr = attributes.find(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (idAttr) {
                const elementId = idAttr.value.value;

                const currentDynamicType =
                    dynamicTypeStack.length > 0
                        ? dynamicTypeStack[dynamicTypeStack.length - 1]
                        : null;

                const templateNode = {
                    ...getTemplateNode(path, filename, componentStack),
                    dynamicType: currentDynamicType,
                };

                mapping[elementId] = templateNode;
            }
        },
    });
    return mapping;
}
