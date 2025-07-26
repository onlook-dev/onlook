import { describe, expect, test } from 'bun:test';
import * as t from '@babel/types';
import fs from 'fs';
import path from 'path';
import { generate, parse } from '@onlook/parser';
import {
    handleJSXExpressionClassName,
    handleStringLiteralClassName,
    createTemplateLiteralWithFont,
    removeFontsFromClassName,
} from '../src';
import { runDataDrivenTests } from './test-utils';

const __dirname = import.meta.dir;

async function processTestCase(
    inputContent: string,
    functionName: 'handleStringLiteralClassName' | 'handleJSXExpressionClassName',
    fontName = 'inter',
): Promise<string> {
    const ast = parse(inputContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontVarExpr = t.memberExpression(t.identifier(fontName), t.identifier('variable'));

    // Find the first JSX element with a className attribute
    let classNameAttr: t.JSXAttribute | null = null;

    const findClassNameAttr = (node: any) => {
        if (t.isJSXElement(node)) {
            const attr = node.openingElement.attributes.find(
                (attr: any) => t.isJSXAttribute(attr) && attr.name?.name === 'className',
            ) as t.JSXAttribute | undefined;
            if (attr && !classNameAttr) {
                classNameAttr = attr;
            }
        }
    };

    // Traverse the AST to find className attributes
    const traverse = (node: any) => {
        if (node && typeof node === 'object') {
            findClassNameAttr(node);
            for (const key in node) {
                if (Array.isArray(node[key])) {
                    node[key].forEach(traverse);
                } else if (typeof node[key] === 'object') {
                    traverse(node[key]);
                }
            }
        }
    };

    traverse(ast);

    if (classNameAttr) {
        if (functionName === 'handleStringLiteralClassName') {
            handleStringLiteralClassName(classNameAttr, fontVarExpr);
        } else {
            handleJSXExpressionClassName(classNameAttr, fontVarExpr, fontName);
        }
    }

    const { code } = generate(ast);
    return code;
}

async function processRemoveFontsTestCase(
    inputContent: string,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): Promise<string> {
    const ast = parse(inputContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    // Find the first JSX element with a className attribute
    let classNameAttr: t.JSXAttribute | null = null;

    const findClassNameAttr = (node: any) => {
        if (t.isJSXElement(node)) {
            const attr = node.openingElement.attributes.find(
                (attr: any) => t.isJSXAttribute(attr) && attr.name?.name === 'className',
            ) as t.JSXAttribute | undefined;
            if (attr && !classNameAttr) {
                classNameAttr = attr;
            }
        }
    };

    // Traverse the AST to find className attributes
    const traverse = (node: any) => {
        if (node && typeof node === 'object') {
            findClassNameAttr(node);
            for (const key in node) {
                if (Array.isArray(node[key])) {
                    node[key].forEach(traverse);
                } else if (typeof node[key] === 'object') {
                    traverse(node[key]);
                }
            }
        }
    };

    traverse(ast);

    if (classNameAttr) {
        removeFontsFromClassName(classNameAttr, options);
    }

    const { code } = generate(ast);
    return code;
}

async function processCreateTemplateLiteralTestCase(
    inputContent: string,
    fontName = 'inter',
): Promise<string> {
    const ast = parse(inputContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontVarExpr = t.memberExpression(t.identifier(fontName), t.identifier('variable'));

    // Find the first JSX element with a className attribute
    let classNameAttr: t.JSXAttribute | null = null;

    const findClassNameAttr = (node: any) => {
        if (t.isJSXElement(node)) {
            const attr = node.openingElement.attributes.find(
                (attr: any) => t.isJSXAttribute(attr) && attr.name?.name === 'className',
            ) as t.JSXAttribute | undefined;
            if (attr && !classNameAttr) {
                classNameAttr = attr;
            }
        }
    };

    // Traverse the AST to find className attributes
    const traverse = (node: any) => {
        if (node && typeof node === 'object') {
            findClassNameAttr(node);
            for (const key in node) {
                if (Array.isArray(node[key])) {
                    node[key].forEach(traverse);
                } else if (typeof node[key] === 'object') {
                    traverse(node[key]);
                }
            }
        }
    };

    traverse(ast);

    if (classNameAttr && classNameAttr.value) {
        // Apply createTemplateLiteralWithFont to the className value
        let originalExpr: t.Expression;
        const attrValue = classNameAttr.value;

        if (t.isStringLiteral(attrValue)) {
            originalExpr = attrValue;
        } else if (t.isJSXExpressionContainer(attrValue) && t.isExpression(attrValue.expression)) {
            originalExpr = attrValue.expression;
        } else {
            return inputContent; // No valid expression to transform
        }

        const newTemplateLiteral = createTemplateLiteralWithFont(fontVarExpr, originalExpr);
        classNameAttr.value = t.jsxExpressionContainer(newTemplateLiteral);
    }

    const { code } = generate(ast);
    return code;
}

describe('removeFontsFromClassName', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/remove-fonts-classname'),
        },
        async (inputContent: string, filePath?: string) => {
            // Extract config from the same directory as the input file
            let options: { fontIds?: string[]; removeAll?: boolean } = {};

            if (filePath) {
                const caseDir = path.dirname(filePath);
                const files = fs.readdirSync(caseDir);
                const configFile = files.find((f) => f.startsWith('config.'));

                if (configFile) {
                    const configPath = path.resolve(caseDir, configFile);
                    const configContent = await Bun.file(configPath).text();
                    options = JSON.parse(configContent);
                }
            }

            return processRemoveFontsTestCase(inputContent, options);
        },
    );
});

describe('createTemplateLiteralWithFont', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/create-template-literal-with-font'),
        },
        (inputContent: string) => processCreateTemplateLiteralTestCase(inputContent),
    );
});

describe('handleStringLiteralClassName', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/string-literal-classname'),
        },
        (inputContent: string) => processTestCase(inputContent, 'handleStringLiteralClassName'),
    );
});

describe('handleJSXExpressionClassName', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/jsx-expression-classname'),
        },
        (inputContent: string) => processTestCase(inputContent, 'handleJSXExpressionClassName'),
    );
});
