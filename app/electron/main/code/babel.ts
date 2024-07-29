import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse'; // Add NodePath import
import t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { readCodeBlock } from '.';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';
import { TemplateNode, TemplateTag } from '/common/models/element/templateNode';

export function getStyleCodeDiffs(styleParams: StyleChangeParam[]): StyleCodeDiff[] {
    const diffs: StyleCodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const styleParam of styleParams) {
        const codeBlock = styleParam.codeBlock;
        const ast = parseJsx(codeBlock);
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

function parseJsx(code: string): t.File {
    return parse(code, {
        plugins: ['typescript', 'jsx'],
    });
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

export async function getTemplateNodeArray(templateNode: TemplateNode) {
    const codeBlock = await readCodeBlock(templateNode);
    const component = templateNode.component;
    const filename = templateNode.path;
    const ast = parseJsx(codeBlock);
    return getAstAsTemplateNodeArray(ast, filename, component);
}

function getAstAsTemplateNodeArray(
    ast: t.File,
    filename: string,
    component: string,
): TemplateNode[] {
    const arr: TemplateNode[] = [];
    traverse(ast, {
        JSXElement(path) {
            const template = getTemplateNode(path, filename, component);
            arr.push(template);
        },
    });
    return arr;
}

function getTemplateNode(path: NodePath<t.JSXElement>, filename: string, component: string) {
    if (!path.node.openingElement.loc) {
        throw new Error('No location found for opening element');
    }

    const name = (path.node.openingElement.name as t.JSXIdentifier).name;
    const componentName = isReactComponent(name) ? name : component;

    const startTag: TemplateTag = {
        start: {
            line: path.node.openingElement.loc.start.line,
            column: path.node.openingElement.loc.start.column + 1,
        },
        end: {
            line: path.node.openingElement.loc.end.line,
            column: path.node.openingElement.loc.end.column + 1,
        },
    };
    const endTag: TemplateTag = path.node.closingElement?.loc
        ? {
              start: {
                  line: path.node.closingElement.loc.start.line,
                  column: path.node.closingElement.loc.start.column + 1,
              },
              end: {
                  line: path.node.closingElement.loc.end.line,
                  column: path.node.closingElement.loc.end.column + 1,
              },
          }
        : startTag;

    const template: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component: componentName,
    };

    return template;
}

function isReactComponent(component: string) {
    // React components are capitalized or has . in the middle of name
    return /^[A-Z]/.test(component) || component.includes('.');
}
