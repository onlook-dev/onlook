import { type GeneratorOptions } from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import * as fs from 'fs';
import { customAlphabet } from 'nanoid';
import * as nodePath from 'path';
import { formatContent, readFile, writeFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';

const ALLOWED_EXTENSIONS = ['.jsx', '.tsx'];
const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'build', '.next'];
const generateOptions: GeneratorOptions = { retainLines: true, compact: false };

const dirPath = '/Users/kietho/workplace/onlook/test/test';
const idToTemplateNodeMap = new Map<string, TemplateNode>();

const VALID_DATA_ATTR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-._:';
const generateId = customAlphabet(VALID_DATA_ATTR_CHARS, 7);

export async function postRun() {
    console.log('postRun');
    await processDir(dirPath, 'remove');
}

export async function processDir(dirPath: string, mode: 'add' | 'map' | 'remove') {
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filepath = nodePath.join(dirPath, file);
            const stat = fs.statSync(filepath);

            if (stat.isDirectory()) {
                if (IGNORED_DIRECTORIES.includes(file)) {
                    return;
                }
                await processDir(filepath, mode);
            } else {
                const fileExt = nodePath.extname(file);
                if (ALLOWED_EXTENSIONS.includes(fileExt)) {
                    await processFile(filepath, mode);
                }
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

async function processFile(filePath: string, mode: 'add' | 'map' | 'remove') {
    try {
        const content = await readFile(filePath);
        const ast = parseJsxFile(content);
        if (!ast) {
            console.error('No AST found');
            return;
        }

        if (mode === 'add') {
            instrumentAst(ast, true);
        } else if (mode === 'map') {
            createTemplateNodeMap(ast, filePath);
        } else {
            instrumentAst(ast, false);
        }

        const generated = generateCode(ast, generateOptions, content);
        const formatted = await formatContent(filePath, generated);
        writeFile(filePath, formatted);
    } catch (error) {
        console.error('Error processing file:', error);
    }
}

function createTemplateNodeMap(ast: t.File, filename: string) {
    const componentStack: string[] = [];

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
                const templateNode = getTemplateNode(path, filename, componentStack);
                idToTemplateNodeMap.set(elementId, templateNode);
            }
        },
    });
}
