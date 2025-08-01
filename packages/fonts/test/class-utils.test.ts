import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { generate, parse, types as t, type t as T } from '@onlook/parser';
import {
    updateJSXExpressionClassNameWithFont,
    updateStringLiteralClassNameWithFont,
    createTemplateLiteralWithFont,
    removeFontsFromClassName,
    createStringLiteralWithFont,
    updateTemplateLiteralWithFontClass,
} from '../src';
import { runDataDrivenTests } from './test-utils';

const __dirname = import.meta.dir;

async function processClassNameAttribute(
    inputContent: string,
    processor: (
        classNameAttr: T.JSXAttribute,
        fontVarExpr?: T.MemberExpression,
        fontName?: string,
    ) => boolean | void,
    fontName = 'inter',
): Promise<string> {
    const ast = parse(inputContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontVarExpr = t.memberExpression(t.identifier(fontName), t.identifier('variable'));

    // Find the first JSX element with a className attribute
    let classNameAttr: T.JSXAttribute | null = null;

    const findClassNameAttr = (node: any) => {
        if (t.isJSXElement(node)) {
            const attr = node.openingElement.attributes.find(
                (attr: any) => t.isJSXAttribute(attr) && attr.name?.name === 'className',
            ) as T.JSXAttribute | undefined;
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
        const shouldSkipCodeGeneration = processor(classNameAttr, fontVarExpr, fontName);
        if (shouldSkipCodeGeneration) {
            return inputContent;
        }
    }

    const { code } = generate(ast);
    return code;
}

async function processTestCase(
    inputContent: string,
    functionName: 'updateStringLiteralClassNameWithFont' | 'updateJSXExpressionClassNameWithFont',
    fontName = 'inter',
): Promise<string> {
    return processClassNameAttribute(
        inputContent,
        (classNameAttr, fontVarExpr, fontName) => {
            if (functionName === 'updateStringLiteralClassNameWithFont') {
                updateStringLiteralClassNameWithFont(classNameAttr, fontVarExpr!);
            } else {
                updateJSXExpressionClassNameWithFont(classNameAttr, fontVarExpr!, fontName!);
            }
        },
        fontName,
    );
}

async function processRemoveFontsTestCase(
    inputContent: string,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): Promise<string> {
    return processClassNameAttribute(inputContent, (classNameAttr) => {
        removeFontsFromClassName(classNameAttr, options);
    });
}

async function processCreateTemplateLiteralTestCase(
    inputContent: string,
    fontName = 'inter',
): Promise<string> {
    return processClassNameAttribute(
        inputContent,
        (classNameAttr, fontVarExpr) => {
            if (!classNameAttr.value) return true;

            let originalExpr: T.Expression;
            const attrValue = classNameAttr.value;

            if (t.isStringLiteral(attrValue)) {
                originalExpr = attrValue;
            } else if (
                t.isJSXExpressionContainer(attrValue) &&
                t.isExpression(attrValue.expression)
            ) {
                originalExpr = attrValue.expression;
            } else {
                return true;
            }

            const newTemplateLiteral = createTemplateLiteralWithFont(fontVarExpr!, originalExpr);
            classNameAttr.value = t.jsxExpressionContainer(newTemplateLiteral);
        },
        fontName,
    );
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

describe('updateStringLiteralClassNameWithFont', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(
                __dirname,
                'data/update-classname-with-font-var/string-literal-classname',
            ),
        },
        (inputContent: string) =>
            processTestCase(inputContent, 'updateStringLiteralClassNameWithFont'),
    );
});

describe('updateJSXExpressionClassNameWithFont', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(
                __dirname,
                'data/update-classname-with-font-var/jsx-expression-classname',
            ),
        },
        (inputContent: string) =>
            processTestCase(inputContent, 'updateJSXExpressionClassNameWithFont'),
    );
});

describe('createStringLiteralWithFont', () => {
    test('should add font class when no font class exists', () => {
        const result = createStringLiteralWithFont('font-inter', 'text-lg text-gray-900');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter text-lg text-gray-900');
    });

    test('should replace existing font class when one exists', () => {
        const result = createStringLiteralWithFont(
            'font-roboto',
            'font-inter text-lg text-gray-900',
        );

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-roboto text-lg text-gray-900');
    });

    test('should handle empty className string', () => {
        const result = createStringLiteralWithFont('font-inter', '');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter');
    });

    test('should handle className with only whitespace', () => {
        const result = createStringLiteralWithFont('font-inter', '   ');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter');
    });

    test('should handle className with multiple spaces between classes', () => {
        const result = createStringLiteralWithFont('font-inter', 'text-lg   text-gray-900');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter text-lg   text-gray-900');
    });

    test('should handle font class that starts with font- but is not at the beginning', () => {
        const result = createStringLiteralWithFont('font-inter', 'text-lg font-bold text-gray-900');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('text-lg font-inter text-gray-900');
    });

    test('should handle complex className with various font-related classes', () => {
        const result = createStringLiteralWithFont(
            'font-inter',
            'font-sans font-bold text-lg text-gray-900 hover:text-black',
        );

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter font-bold text-lg text-gray-900 hover:text-black');
    });

    test('should handle className that ends with font class', () => {
        const result = createStringLiteralWithFont('font-inter', 'text-lg font-sans');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('text-lg font-inter');
    });

    test('should handle className with only a font class', () => {
        const result = createStringLiteralWithFont('font-inter', 'font-sans');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter');
    });

    test('should handle className with leading and trailing spaces', () => {
        const result = createStringLiteralWithFont('font-inter', '  text-lg text-gray-900  ');

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter   text-lg text-gray-900');
    });

    test('should handle multiple font classes and replace only the first one', () => {
        const result = createStringLiteralWithFont(
            'font-inter',
            'font-sans font-bold font-extrabold text-lg',
        );

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('font-inter font-bold font-extrabold text-lg');
    });

    test('should handle font class with numbers and special characters', () => {
        const result = createStringLiteralWithFont(
            'font-inter',
            'text-lg font-roboto-400 text-gray-900',
        );

        expect(result.type).toBe('StringLiteral');
        expect(result.value).toBe('text-lg font-inter text-gray-900');
    });
});

describe('updateTemplateLiteralWithFontClass', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/update-template-literal-with-font-class'),
        },
        (inputContent: string) =>
            processClassNameAttribute(inputContent, (classNameAttr) => {
                const fontClassName = 'font-inter';
                if (t.isJSXExpressionContainer(classNameAttr.value)) {
                    const expr = classNameAttr.value.expression;
                    if (t.isTemplateLiteral(expr)) {
                        const result = updateTemplateLiteralWithFontClass(expr, fontClassName);
                        if (!result) {
                            console.warn('Failed to update template literal with font class');
                        }
                    }
                }
            }),
    );
});
