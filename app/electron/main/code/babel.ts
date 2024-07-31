import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse'; // Add NodePath import
import t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { readFile } from './files';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';
import { TemplateNode, TemplateTag } from '/common/models/element/templateNode';

export function getStyleCodeDiffs(styleParams: StyleChangeParam[]): StyleCodeDiff[] {
    const diffs: StyleCodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const styleParam of styleParams) {
        const codeBlock = styleParam.codeBlock;
        const ast = parseJsx(codeBlock);
        if (!ast) {
            throw new Error('Failed to parse code block');
        }
        const original = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );

        addClassToAst(ast, styleParam.tailwind);

        const generated = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );
        diffs.push({ original, generated, param: styleParam });
    }

    return diffs;
}

function removeSemiColonIfApplicable(code: string, original: string) {
    if (!original.endsWith(';') && code.endsWith(';')) {
        return code.slice(0, -1);
    }
    return code;
}

function parseJsx(code: string): t.File | undefined {
    try {
        return parse(code, {
            plugins: ['typescript', 'jsx'],
            sourceType: 'module',
        });
    } catch (e) {
        console.error(e, code);
    }
}

function addClassToAst(ast: t.File, className: string) {
    let processed = false;
    traverse(ast, {
        JSXOpeningElement(path) {
            if (processed) {
                return;
            }
            let classNameAttr = null;
            path.node.attributes.forEach((attribute) => {
                if (t.isJSXAttribute(attribute) && attribute.name.name === 'className') {
                    classNameAttr = attribute;

                    if (t.isStringLiteral(attribute.value)) {
                        attribute.value.value = twMerge(attribute.value.value, className);
                    }
                    // Handle className that is an expression (e.g., cn("class1", className))
                    else if (
                        t.isJSXExpressionContainer(attribute.value) &&
                        t.isCallExpression(attribute.value.expression)
                    ) {
                        attribute.value.expression.arguments.push(t.stringLiteral(className));
                    }
                }
            });

            if (!classNameAttr) {
                const newClassNameAttr = t.jsxAttribute(
                    t.jsxIdentifier('className'),
                    t.stringLiteral(className),
                );
                path.node.attributes.push(newClassNameAttr);
            }
            processed = true;
        },
    });
}

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
    templateNode: TemplateNode,
    index: number,
): Promise<TemplateNode | undefined> {
    const codeBlock = await readFile(templateNode.path);
    const ast = parseJsx(codeBlock);
    if (!ast) {
        return;
    }

    let childTemplateNode: TemplateNode | undefined;

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
                    const jsxChildren = node.children.filter((child) => t.isJSXElement(child));
                    if (index < jsxChildren.length) {
                        const child = jsxChildren[index];
                        if (t.isJSXElement(child)) {
                            childTemplateNode = getTemplateNode(child, templateNode.path);
                            path.stop();
                        }
                    }
                }
            }
        },
    });
    return childTemplateNode;
}

function getTemplateNode(node: t.JSXElement, path: string): TemplateNode {
    if (!node.openingElement.loc) {
        throw new Error('No location found for opening element');
    }

    const name = (node.openingElement.name as t.JSXIdentifier).name;

    const startTag: TemplateTag = {
        start: {
            line: node.openingElement.loc.start.line,
            column: node.openingElement.loc.start.column + 1,
        },
        end: {
            line: node.openingElement.loc.end.line,
            column: node.openingElement.loc.end.column + 1,
        },
    };
    const endTag: TemplateTag = node.closingElement?.loc
        ? {
              start: {
                  line: node.closingElement.loc.start.line,
                  column: node.closingElement.loc.start.column + 1,
              },
              end: {
                  line: node.closingElement.loc.end.line,
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

function isReactComponent(component: string) {
    // React components are capitalized or has . in the middle of name
    return /^[A-Z]/.test(component) || component.includes('.');
}
