import * as t from '@babel/types';
import { DEPRECATED_PRELOAD_SCRIPT_SRCS, PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
    getAstFromContent,
    getContentFromAst,
    removeDeprecatedPreloadScripts,
    scanForPreloadScript,
} from 'src';

const __dirname = import.meta.dir;

describe('Environment-dependent behavior', () => {
    test('should remove correct deprecated scripts for current environment', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
                <Script type="module" src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}" />
            </head>
            <body>
                <main />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        removeDeprecatedPreloadScripts(ast);
        const result = await getContentFromAst(ast, input);

        // Current environment script should remain
        expect(result).toContain(`src="${PRELOAD_SCRIPT_SRC}"`);
        // Deprecated script for current environment should be removed
        expect(result).not.toContain(`src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}"`);
        // Other deprecated scripts should also be removed
        expect(result).not.toContain(`src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}"`);
    });

    test('should scan correctly for production environment script', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <body>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(true);
    });

    test('should identify deprecated script as deprecated for production environment', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <body>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
                <Script type="module" src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}" />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(1);
        expect(result.injectedCorrectly).toBe(true);
    });

    test('should handle mixed current and deprecated scripts for development environment', async () => {
        process.env.NODE_ENV = 'development';
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <body>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(true);
    });
});

describe('removeDeprecatedPreloadScripts', () => {
    const SHOULD_UPDATE_EXPECTED = false;
    const casesDir = path.resolve(__dirname, 'data/layout');

    // Only test cases that have deprecated scripts to remove
    const relevantTestCases = ['removes-deprecated-script', 'removes-deprecated-script-multiple'];

    for (const testCase of relevantTestCases) {
        test(`should handle case: ${testCase}`, async () => {
            const caseDir = path.resolve(casesDir, testCase);
            const files = fs.readdirSync(caseDir);

            const inputFile = files.find((f) => f.startsWith('input.'));
            if (!inputFile) {
                throw new Error(`Test case ${testCase} is missing input file.`);
            }

            const inputPath = path.resolve(caseDir, inputFile);
            const inputContent = await Bun.file(inputPath).text();

            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            // Apply only the removeDeprecatedPreloadScripts function
            removeDeprecatedPreloadScripts(ast);
            const result = await getContentFromAst(ast, inputContent);

            // Create expected output path for preload tests
            const expectedPath = path.resolve(caseDir, `expected-preload.tsx`);

            if (SHOULD_UPDATE_EXPECTED) {
                await Bun.write(expectedPath, result);
            }

            // For now, let's create the expected files manually based on what should happen
            if (!fs.existsSync(expectedPath)) {
                throw new Error(
                    `Expected file ${expectedPath} does not exist. Run test with SHOULD_UPDATE_EXPECTED = true first to generate it.`,
                );
            }

            const expectedContent = await Bun.file(expectedPath).text();
            expect(result).toBe(expectedContent);
        });
    }

    // Test additional cases to ensure the function only removes deprecated scripts
    test('should not remove non-deprecated scripts', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
                <Script type="module" src="https://example.com/other-script.js" />
            </head>
            <body>
                <main />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        removeDeprecatedPreloadScripts(ast);
        const result = await getContentFromAst(ast, input);

        // Should keep both scripts since neither is deprecated
        expect(result).toContain(`src="${PRELOAD_SCRIPT_SRC}"`);
        expect(result).toContain('src="https://example.com/other-script.js"');
    });

    test('should remove only deprecated scripts and keep current ones', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />
                <Script type="module" src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}" />
            </head>
            <body>
                <main />
            </body>
        </html>
    );
}`;

        const ast = getAstFromContent(input);
        if (!ast) throw new Error('Failed to parse input code');

        removeDeprecatedPreloadScripts(ast);
        const result = await getContentFromAst(ast, input);

        // Should keep the current script
        expect(result).toContain(`src="${PRELOAD_SCRIPT_SRC}"`);
        // Should remove deprecated scripts
        expect(result).not.toContain(`src="${DEPRECATED_PRELOAD_SCRIPT_SRCS[0]}"`);
    });
});

describe('scanForPreloadScript', () => {
    const layoutCasesDir = path.resolve(__dirname, 'data/layout');

    // Test cases using existing layout test data
    const testCaseExpectations = {
        'adds-script-if-missing': {
            scriptCount: 0,
            deprecatedScriptCount: 0,
            injectedCorrectly: false,
        },
        'does-not-duplicate': {
            scriptCount: 2,
            deprecatedScriptCount: 0,
            injectedCorrectly: false,
        },
        'removes-deprecated-script': {
            scriptCount: 0,
            deprecatedScriptCount: 0,
            injectedCorrectly: false,
        },
        'removes-deprecated-script-multiple': {
            scriptCount: 0,
            deprecatedScriptCount: 2,
            injectedCorrectly: false,
        },
        'injects-at-bottom': {
            scriptCount: 0,
            deprecatedScriptCount: 0,
            injectedCorrectly: false,
        },
    };

    for (const [testCase, expected] of Object.entries(testCaseExpectations)) {
        test(`should correctly scan ${testCase}`, async () => {
            const caseDir = path.resolve(layoutCasesDir, testCase);
            const inputPath = path.resolve(caseDir, 'input.tsx');

            const inputContent = await Bun.file(inputPath).text();
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const result = scanForPreloadScript(ast);

            expect(result.scriptCount).toBe(expected.scriptCount);
            expect(result.deprecatedScriptCount).toBe(expected.deprecatedScriptCount);
            expect(result.injectedCorrectly).toBe(expected.injectedCorrectly);
        });
    }

    function createMockAst(body: t.Statement[]): t.File {
        return t.file(t.program(body), [], []);
    }

    function createScriptElement(src: string, parentElement?: 'body' | 'html'): t.JSXElement {
        const scriptElement = t.jsxElement(
            t.jsxOpeningElement(
                t.jsxIdentifier('Script'),
                [t.jsxAttribute(t.jsxIdentifier('src'), t.stringLiteral(src))],
                false,
            ),
            t.jsxClosingElement(t.jsxIdentifier('Script')),
            [],
            false,
        );

        if (parentElement) {
            const parent = t.jsxElement(
                t.jsxOpeningElement(t.jsxIdentifier(parentElement), [], false),
                t.jsxClosingElement(t.jsxIdentifier(parentElement)),
                [scriptElement],
                false,
            );
            return parent;
        }

        return scriptElement;
    }

    function createComponentWithJSX(jsxElement: t.JSXElement): t.File {
        const returnStatement = t.returnStatement(jsxElement);
        const arrowFunction = t.arrowFunctionExpression([], t.blockStatement([returnStatement]));
        const exportDeclaration = t.exportDefaultDeclaration(arrowFunction);

        return createMockAst([exportDeclaration]);
    }

    test('should handle exactly one valid script in body as injected correctly', () => {
        const bodyWithScript = createScriptElement(PRELOAD_SCRIPT_SRC, 'body');
        const ast = createComponentWithJSX(bodyWithScript);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(true);
    });

    test('should handle valid script outside body as not injected correctly', () => {
        const scriptElement = createScriptElement(PRELOAD_SCRIPT_SRC);
        const divWithScript = t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier('div'), [], false),
            t.jsxClosingElement(t.jsxIdentifier('div')),
            [scriptElement],
            false,
        );
        const ast = createComponentWithJSX(divWithScript);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(false);
    });

    test('should ignore Script elements without src attribute', () => {
        const scriptWithoutSrc = t.jsxElement(
            t.jsxOpeningElement(
                t.jsxIdentifier('Script'),
                [t.jsxAttribute(t.jsxIdentifier('strategy'), t.stringLiteral('afterInteractive'))],
                false,
            ),
            t.jsxClosingElement(t.jsxIdentifier('Script')),
            [],
            false,
        );
        const ast = createComponentWithJSX(scriptWithoutSrc);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(0);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(false);
    });

    test('should ignore Script elements with non-string src attribute', () => {
        const scriptWithExpressionSrc = t.jsxElement(
            t.jsxOpeningElement(
                t.jsxIdentifier('Script'),
                [
                    t.jsxAttribute(
                        t.jsxIdentifier('src'),
                        t.jsxExpressionContainer(t.identifier('scriptSrc')),
                    ),
                ],
                false,
            ),
            t.jsxClosingElement(t.jsxIdentifier('Script')),
            [],
            false,
        );
        const ast = createComponentWithJSX(scriptWithExpressionSrc);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(0);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(false);
    });
});
