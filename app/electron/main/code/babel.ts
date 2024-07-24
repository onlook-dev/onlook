import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';

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

function parseJsx(code: string) {
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
