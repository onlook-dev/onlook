import * as path from 'path';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import type { DynamicType, TemplateNode } from '@onlook/models/element';
import { generateCode } from '../code/diff/helpers';
import { checkIfCacheDirectoryExists, formatContent, readFile, writeFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';
import {
    GENERATE_CODE_OPTIONS,
    generateId,
    getCoreElementInfo,
    getDynamicTypeInfo,
    getTemplateNode,
    isNodeElementArray,
    isReactFragment,
} from './helpers';
import type { HashesJson } from '@onlook/models';

export async function getFileWithIds(filePath: string): Promise<string | null> {
    const content = await readFile(filePath);
    if (content === null) {
        console.error(`Failed to read file: ${filePath}`);
        return null;
    }
    if (content === '') {
        console.error(`File is empty: ${filePath}`);
        return '';
    }
    const ast = parseJsxFile(content);
    if (!ast) {
        console.error(`Failed to parse file: ${filePath}`);
        return content;
    }
    addIdsToAst(ast);
    const generated = generateCode(ast, GENERATE_CODE_OPTIONS, content);
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
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.push('array');
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
                dynamicTypeStack.push('conditional');
            },
            exit() {
                dynamicTypeStack.pop();
            },
        },
        LogicalExpression: {
            enter(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    dynamicTypeStack.push('conditional');
                }
            },
            exit(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
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

                const dynamicType = getDynamicTypeInfo(path);
                const coreElementType = getCoreElementInfo(path);

                mapping[elementId] = getTemplateNode(
                    path,
                    filename,
                    componentStack,
                    dynamicType,
                    coreElementType,
                );
            }
        },
    });
    return mapping;
}

export async function cacheFile(filePath: string, projectDir: string): Promise<void> {
    await checkIfCacheDirectoryExists(projectDir);

    const content = await readFile(filePath);

    if (!content || content.trim() === '') {
        console.error(`Failed to get content for file: ${filePath}`);
        return;
    }

    const cacheDir = path.join(projectDir, '.onlook', 'cache');

    const baseName = path.basename(filePath, path.extname(filePath));

    const ext = path.extname(filePath);
    const fileNameHash = createHash('sha256').update(filePath).digest('hex').slice(0, 10);

    const cacheFileName = `${baseName}-${fileNameHash}${ext}`;

    const cacheFilePath = path.join(cacheDir, cacheFileName);

    await writeFile(cacheFilePath, content);
}

export async function generateAndStoreHash(filePath: string, projectDir: string) {
    await checkIfCacheDirectoryExists(projectDir);

    const cacheDir = path.join(projectDir, '.onlook', 'cache');
    const hashesFilePath = path.join(cacheDir, 'hashes.json');

    const content = await readFile(filePath);

    if (!content || content.trim() === '') {
        console.error(`Failed to get content for file: ${filePath}`);
        return;
    }

    const hash = createHash('sha256').update(content).digest('hex');

    let hashesJson: HashesJson = {};

    try {
        const existing = await readFile(hashesFilePath);
        if (existing) {
            hashesJson = JSON.parse(existing);
        }
    } catch (e) {
        console.log('No existing hashes.json found, creating new one.');
    }

    const baseName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    const fileNameHash = createHash('sha256').update(filePath).digest('hex').slice(0, 10);

    const cacheFileName = `${baseName}-${fileNameHash}${ext}`;

    const cacheFilePath = path.join(cacheDir, cacheFileName);

    hashesJson[filePath] = {
        hash,
        cache_path: cacheFilePath,
    };

    await fs.writeFile(hashesFilePath, JSON.stringify(hashesJson, null, 2), 'utf8');
}
