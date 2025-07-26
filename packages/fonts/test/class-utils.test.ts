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

describe('removeFontsFromClassName', () => {
    const SHOULD_UPDATE_EXPECTED = true;
    const casesDir = path.resolve(__dirname, 'data/remove-fonts-classname');

    // Check if test cases directory exists
    if (!fs.existsSync(casesDir)) {
        test.skip('Test cases directory does not exist yet', () => {});
        return;
    }

    const testCases = fs.readdirSync(casesDir);

    for (const testCase of testCases) {
        test(`should handle case: ${testCase}`, async () => {
            const caseDir = path.resolve(casesDir, testCase);
            const files = fs.readdirSync(caseDir);

            const inputFile = files.find((f) => f.startsWith('input.'));
            const expectedFile = files.find((f) => f.startsWith('expected.'));
            const configFile = files.find((f) => f.startsWith('config.'));

            if (!inputFile || !expectedFile) {
                throw new Error(`Test case ${testCase} is missing input or expected file.`);
            }

            const inputPath = path.resolve(caseDir, inputFile);
            const expectedPath = path.resolve(caseDir, expectedFile);
            const configPath = configFile ? path.resolve(caseDir, configFile) : null;

            const inputContent = await Bun.file(inputPath).text();

            // Read config if it exists, otherwise use default
            let options: { fontIds?: string[]; removeAll?: boolean } = {};
            if (configPath) {
                const configContent = await Bun.file(configPath).text();
                options = JSON.parse(configContent);
            }

            const result = await processRemoveFontsTestCase(inputContent, options);

            if (SHOULD_UPDATE_EXPECTED) {
                await Bun.write(expectedPath, result);
            }

            const expectedContent = await Bun.file(expectedPath).text();
            expect(result).toBe(expectedContent);
        });
    }
});

describe('createTemplateLiteralWithFont', () => {
    test('should create template literal with string literal input', () => {
        const fontVarExpr = t.memberExpression(t.identifier('inter'), t.identifier('variable'));
        const originalExpr = t.stringLiteral('bg-blue-500 text-white');

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(2);
        expect(result.expressions).toHaveLength(1);

        // Verify quasis content
        expect(result.quasis[0].value.raw).toBe('');
        expect(result.quasis[0].value.cooked).toBe('');
        expect(result.quasis[0].tail).toBe(false);

        expect(result.quasis[1].value.raw).toBe(' bg-blue-500 text-white');
        expect(result.quasis[1].value.cooked).toBe(' bg-blue-500 text-white');
        expect(result.quasis[1].tail).toBe(true);

        // Verify expression
        expect(t.isMemberExpression(result.expressions[0])).toBe(true);
        const memberExpr = result.expressions[0] as t.MemberExpression;
        expect(t.isIdentifier(memberExpr.object) && memberExpr.object.name).toBe('inter');
        expect(t.isIdentifier(memberExpr.property) && memberExpr.property.name).toBe('variable');

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${inter.variable} bg-blue-500 text-white`;');
    });

    test('should create template literal with identifier expression input', () => {
        const fontVarExpr = t.memberExpression(t.identifier('roboto'), t.identifier('variable'));
        const originalExpr = t.identifier('styles');

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(3);
        expect(result.expressions).toHaveLength(2);

        // Verify quasis content
        expect(result.quasis[0].value.raw).toBe('');
        expect(result.quasis[0].tail).toBe(false);

        expect(result.quasis[1].value.raw).toBe(' ');
        expect(result.quasis[1].value.cooked).toBe(' ');
        expect(result.quasis[1].tail).toBe(false);

        expect(result.quasis[2].value.raw).toBe('');
        expect(result.quasis[2].tail).toBe(true);

        // Verify expressions
        expect(result.expressions).toHaveLength(2);
        const fontExpr = result.expressions[0] as t.MemberExpression;
        expect(t.isIdentifier(fontExpr.object) && fontExpr.object.name).toBe('roboto');

        const originalIdentifier = result.expressions[1] as t.Identifier;
        expect(originalIdentifier.name).toBe('styles');

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${roboto.variable} ${styles}`;');
    });

    test('should create template literal with member expression input', () => {
        const fontVarExpr = t.memberExpression(t.identifier('inter'), t.identifier('variable'));
        const originalExpr = t.memberExpression(t.identifier('theme'), t.identifier('colors'));

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(3);
        expect(result.expressions).toHaveLength(2);

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${inter.variable} ${theme.colors}`;');
    });

    test('should create template literal with conditional expression input', () => {
        const fontVarExpr = t.memberExpression(t.identifier('inter'), t.identifier('variable'));
        const originalExpr = t.conditionalExpression(
            t.identifier('isActive'),
            t.stringLiteral('active'),
            t.stringLiteral('inactive'),
        );

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(3);
        expect(result.expressions).toHaveLength(2);

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${inter.variable} ${isActive ? "active" : "inactive"}`;');
    });

    test('should create template literal with empty string literal', () => {
        const fontVarExpr = t.memberExpression(t.identifier('inter'), t.identifier('variable'));
        const originalExpr = t.stringLiteral('');

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(2);
        expect(result.expressions).toHaveLength(1);

        // Verify the space is still added
        expect(result.quasis[1].value.raw).toBe(' ');
        expect(result.quasis[1].value.cooked).toBe(' ');

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${inter.variable} `;');
    });

    test('should create template literal with function call expression input', () => {
        const fontVarExpr = t.memberExpression(t.identifier('inter'), t.identifier('variable'));
        const originalExpr = t.callExpression(t.identifier('cn'), [
            t.stringLiteral('base-class'),
            t.identifier('props.className'),
        ]);

        const result = createTemplateLiteralWithFont(fontVarExpr, originalExpr);

        // Verify structure
        expect(t.isTemplateLiteral(result)).toBe(true);
        expect(result.quasis).toHaveLength(3);
        expect(result.expressions).toHaveLength(2);

        // Generate code to verify output
        const { code } = generate(t.expressionStatement(result));
        expect(code).toBe('`${inter.variable} ${cn("base-class", props.className)}`;');
    });
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
