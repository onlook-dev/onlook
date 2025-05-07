import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import {
    CoreElementType,
    DynamicType,
    type ClassParsingResult,
    type TemplateNode,
    type TemplateTag
} from '@onlook/models';
import { parse } from '@babel/parser';

export function createTemplateNode(
    path: NodePath<t.JSXElement>,
    filename: string,
    componentStack: string[],
    dynamicType: DynamicType | null,
    coreElementType: CoreElementType | null,
): TemplateNode {
    const startTag: TemplateTag = getTemplateTag(path.node.openingElement);
    const endTag: TemplateTag | null = path.node.closingElement
        ? getTemplateTag(path.node.closingElement)
        : null;
    const component = componentStack.length > 0 ? componentStack[componentStack.length - 1] : null;
    const domNode: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component,
        dynamicType,
        coreElementType,
    };
    return domNode;
}

function getTemplateTag(element: t.JSXOpeningElement | t.JSXClosingElement): TemplateTag {
    return {
        start: {
            line: element.loc?.start?.line ?? 0,
            column: element.loc?.start?.column ?? 0 + 1,
        },
        end: {
            line: element.loc?.end?.line ?? 0,
            column: element.loc?.end?.column ?? 0,
        },
    };
}

export async function getTemplateNodeClass(
    templateNode: TemplateNode,
): Promise<ClassParsingResult> {
    const codeBlock = await readCodeBlock(templateNode);
    if (codeBlock == null) {
        console.error(`Failed to read code block: ${templateNode.path}`);
        return { type: 'error', reason: 'Code block could not be read.' };
    }
    const ast = parseJsxCodeBlock(codeBlock);

    if (!ast) {
        return { type: 'error', reason: 'AST could not be parsed.' };
    }

    return getNodeClasses(ast);
}

export function getNodeClasses(node: t.JSXElement): ClassParsingResult {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr): attr is t.JSXAttribute => t.isJSXAttribute(attr) && attr.name.name === 'className',
    );

    if (!classNameAttr) {
        return {
            type: 'classes',
            value: [''],
        };
    }

    if (t.isStringLiteral(classNameAttr.value)) {
        return {
            type: 'classes',
            value: classNameAttr.value.value.split(/\s+/).filter(Boolean),
        };
    }

    if (
        t.isJSXExpressionContainer(classNameAttr.value) &&
        t.isStringLiteral(classNameAttr.value.expression)
    ) {
        return {
            type: 'classes',
            value: classNameAttr.value.expression.value.split(/\s+/).filter(Boolean),
        };
    }

    if (
        t.isJSXExpressionContainer(classNameAttr.value) &&
        t.isTemplateLiteral(classNameAttr.value.expression)
    ) {
        const templateLiteral = classNameAttr.value.expression;

        // Immediately return error if dynamic classes are detected within the template literal
        if (templateLiteral.expressions.length > 0) {
            return {
                type: 'error',
                reason: 'Dynamic classes detected.',
            };
        }

        // Extract and return static classes from the template literal if no dynamic classes are used
        const quasis = templateLiteral.quasis.map((quasi) => quasi.value.raw.split(/\s+/));
        return {
            type: 'classes',
            value: quasis.flat().filter(Boolean),
        };
    }

    return {
        type: 'error',
        reason: 'Unsupported className format.',
    };
}

export function parseJsxFile(code: string): t.File | undefined {
    try {
        return parse(code, {
            plugins: ['typescript', 'jsx'],
            sourceType: 'module', 
            allowImportExportEverywhere: true,
        });
    } catch (e) {
        console.error('Error parsing code', e);
        return;
    }
}

export function parseJsxCodeBlock(code: string, stripIds = false): t.JSXElement | undefined {
    const ast = parseJsxFile(code);
    if (!ast) {
        return;
    }
    if (stripIds) {
        removeIdsFromAst(ast);
    }
    const jsxElement = ast.program.body.find(
        (node) => t.isExpressionStatement(node) && t.isJSXElement(node.expression),
    );

    if (
        jsxElement &&
        t.isExpressionStatement(jsxElement) &&
        t.isJSXElement(jsxElement.expression)
    ) {
        return jsxElement.expression;
    }
}

export async function readCodeBlock(
    templateNode: TemplateNode,
    stripIds: boolean = false,
): Promise<string | null> {
    try {
        const filePath = templateNode.path;

        const startTag = templateNode.startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;

        const endTag = templateNode.endTag || startTag;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        const fileContent = await readFile(filePath);
        if (fileContent == null) {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
        const lines = fileContent.split('\n');

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

        if (stripIds) {
            const ast = parseJsxCodeBlock(selectedText, true);
            if (ast) {
                return generateCode(ast, GENERATE_CODE_OPTIONS, selectedText);
            }
        }

        return selectedText;
    } catch (error: any) {
        console.error('Error reading range from file:', error);
        throw error;
    }
}