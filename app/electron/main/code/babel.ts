import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import { InsertedChild, InsertedElement } from '/common/models/element/insert';

export function getCodeDiffs(requests: CodeDiffRequest[]): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const request of requests) {
        const codeBlock = request.codeBlock;
        const ast = parseJsx(codeBlock);
        if (!ast) {
            continue;
        }
        const original = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );

        if (request.attributes.className) {
            addClassToAst(ast, request.attributes.className);
        }

        for (const element of request.elements) {
            insertElementToAst(ast, element);
        }

        const generated = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );
        diffs.push({ original, generated, templateNode: request.templateNode });
    }

    return diffs;
}

function removeSemiColonIfApplicable(code: string, original: string) {
    if (!original.endsWith(';') && code.endsWith(';')) {
        return code.slice(0, -1);
    }
    return code;
}

export function parseJsx(code: string): t.File | undefined {
    try {
        return parse(code, {
            plugins: ['typescript', 'jsx'],
            sourceType: 'module',
            allowImportExportEverywhere: true,
        });
    } catch (e) {
        console.error('Error parsing code:', code);
        return;
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

            path.stop();
            processed = true;
        },
    });
}

function insertElementToAst(ast: t.File, element: InsertedElement) {
    let processed = false;

    traverse(ast, {
        JSXElement(path) {
            if (processed) {
                return;
            }

            const newElement = createJSXElement(element);

            switch (element.location.position) {
                case 'append':
                    path.node.children.push(newElement);
                    break;
                case 'prepend':
                    path.node.children.unshift(newElement);
                    break;
                default:
                    console.error(`Unhandled position: ${element.location.position}`);
                    path.node.children.push(newElement);
                    break;
            }

            path.stop();
            processed = true;
        },
    });
}

function createJSXElement(insertedChild: InsertedChild): t.JSXElement {
    const attributes = Object.entries(insertedChild.attributes || {}).map(([key, value]) =>
        t.jsxAttribute(
            t.jsxIdentifier(key),
            typeof value === 'string'
                ? t.stringLiteral(value)
                : t.jsxExpressionContainer(t.stringLiteral(JSON.stringify(value))),
        ),
    );

    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(
        insertedChild.tagName.toLowerCase(),
    );

    const openingElement = t.jsxOpeningElement(
        t.jsxIdentifier(insertedChild.tagName),
        attributes,
        isSelfClosing,
    );

    let closingElement = null;
    if (!isSelfClosing) {
        closingElement = t.jsxClosingElement(t.jsxIdentifier(insertedChild.tagName));
    }

    const children = (insertedChild.children || []).map(createJSXElement);

    return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}
