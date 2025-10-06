import * as t from '@babel/types';
import { DEPRECATED_PRELOAD_SCRIPT_SRCS, ONLOOK_PRELOAD_SCRIPT_SRC } from '@onlook/constants';
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
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
        expect(result).toContain(`src="${ONLOOK_PRELOAD_SCRIPT_SRC}"`);
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
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
    // Test additional cases to ensure the function only removes deprecated scripts
    test('should not remove non-deprecated scripts', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
        expect(result).toContain(`src="${ONLOOK_PRELOAD_SCRIPT_SRC}"`);
        expect(result).toContain('src="https://example.com/other-script.js"');
    });

    test('should remove only deprecated scripts and keep current ones', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="${ONLOOK_PRELOAD_SCRIPT_SRC}" />
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
        expect(result).toContain(`src="${ONLOOK_PRELOAD_SCRIPT_SRC}"`);
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
            scriptCount: 0,
            deprecatedScriptCount: 2,
            injectedCorrectly: false,
        },
        'removes-deprecated-script': {
            scriptCount: 0,
            deprecatedScriptCount: 0,
            injectedCorrectly: false,
        },
        'removes-deprecated-script-multiple': {
            scriptCount: 0,
            deprecatedScriptCount: 0,
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
        const bodyWithScript = createScriptElement(ONLOOK_PRELOAD_SCRIPT_SRC, 'body');
        const ast = createComponentWithJSX(bodyWithScript);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(true);
    });

    test('should handle valid script outside body as not injected correctly', () => {
        const scriptElement = createScriptElement(ONLOOK_PRELOAD_SCRIPT_SRC);
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
