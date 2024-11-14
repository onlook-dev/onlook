import generate, { type GeneratorOptions } from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import type { TemplateNode, TemplateTag } from '@onlook/models/element';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import * as fs from 'fs';
import * as nodePath from 'path';
import { formatContent, readFile, writeFile } from '../code/files';
import { parseJsxFile, removeSemiColonIfApplicable } from '../code/helpers';

const ALLOWED_EXTENSIONS = ['.jsx', '.tsx'];
const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'build', '.next'];
const generateOptions: GeneratorOptions = { retainLines: true, compact: false };

const dirPath = '/Users/kietho/workplace/onlook/test/test';

export async function preRun() {
    console.log('preRun');
    await processDir(dirPath, true);
}

export async function postRun() {
    console.log('postRun');
    await processDir(dirPath, false);
}

async function processDir(dirPath: string, isAdding: boolean) {
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filepath = nodePath.join(dirPath, file);
            const stat = fs.statSync(filepath);

            if (stat.isDirectory()) {
                if (IGNORED_DIRECTORIES.includes(file)) {
                    return;
                }
                await processDir(filepath, isAdding);
            } else {
                const fileExt = nodePath.extname(file);
                if (ALLOWED_EXTENSIONS.includes(fileExt)) {
                    await processFile(filepath, isAdding);
                }
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

async function processFile(filePath: string, isAdding: boolean) {
    try {
        const content = await readFile(filePath);
        const ast = parseJsxFile(content);
        if (!ast) {
            console.error('No AST found');
            return;
        }
        instrumentAst(ast, filePath, isAdding);

        const generated = generateCode(ast, generateOptions, content);
        const formatted = await formatContent(filePath, generated);
        writeFile(filePath, formatted);
    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

export function generateCode(ast: t.File, options: GeneratorOptions, codeBlock: string): string {
    return removeSemiColonIfApplicable(generate(ast, options, codeBlock).code, codeBlock);
}

function instrumentAst(ast: t.File, filePath: string, isAdding: boolean) {
    const componentStack: string[] = [];

    traverse(ast, {
        FunctionDeclaration: {
            enter(path: any) {
                const componentName = path.node.id.name;
                componentStack.push(componentName);
            },
            exit(path: any) {
                componentStack.pop();
            },
        },
        ClassDeclaration: {
            enter(path: any) {
                const componentName = path.node.id.name;
                componentStack.push(componentName);
            },
            exit(path: any) {
                componentStack.pop();
            },
        },
        VariableDeclaration: {
            enter(path: any) {
                const componentName = path.node.declarations[0].id.name;
                componentStack.push(componentName);
            },
            exit(path: any) {
                componentStack.pop();
            },
        },
        JSXElement(path: any) {
            if (isReactFragment(path.node.openingElement)) {
                return;
            }

            if (
                !path.node.openingElement.loc ||
                !path.node.openingElement.loc.start ||
                !path.node.openingElement.loc.end
            ) {
                return;
            }

            const attributes = path.node.openingElement.attributes;
            const existingAttrIndex = attributes.findIndex(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (existingAttrIndex !== -1) {
                attributes.splice(existingAttrIndex, 1);
            }

            if (isAdding) {
                const attributeValue = getTemplateNode(path, filePath, componentStack);
                const onlookAttribute = t.jSXAttribute(
                    t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                    t.stringLiteral(attributeValue),
                );
                attributes.push(onlookAttribute);
            }
        },
    });
}

export function getTemplateNode(path: any, filename: string, componentStack: string[]): string {
    const startTag: TemplateTag = getTemplateTag(path.node.openingElement);
    const endTag: TemplateTag | undefined = path.node.closingElement
        ? getTemplateTag(path.node.closingElement)
        : undefined;
    const componentName =
        componentStack.length > 0 ? componentStack[componentStack.length - 1] : undefined;
    const domNode: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component: componentName,
    };
    return compress(domNode);
}

function getTemplateTag(element: any): TemplateTag {
    return {
        start: {
            line: element.loc.start.line,
            column: element.loc.start.column + 1,
        },
        end: {
            line: element.loc.end.line,
            column: element.loc.end.column,
        },
    };
}

export function compress(json: object) {
    // Compress JSON to base64
    const buf = strToU8(JSON.stringify(json));
    const compressed = compressSync(buf);
    const base64 = Buffer.from(compressed).toString('base64');
    return base64;
}

export function decompress(base64: string) {
    // Decompress base64 to JSON
    const buffer = new Uint8Array(
        atob(base64)
            .split('')
            .map((c) => c.charCodeAt(0)),
    );
    const decompressed = decompressSync(buffer);
    const str = strFromU8(decompressed);
    return JSON.parse(str);
}

export function isReactFragment(openingElement: any): boolean {
    const name = openingElement.name;

    if (t.isJSXIdentifier(name)) {
        return name.name === 'Fragment';
    }

    if (t.isJSXMemberExpression(name)) {
        return (
            t.isJSXIdentifier(name.object) &&
            name.object.name === 'React' &&
            t.isJSXIdentifier(name.property) &&
            name.property.name === 'Fragment'
        );
    }

    return false;
}
