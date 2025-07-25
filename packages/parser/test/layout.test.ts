import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
    getAstFromContent,
    getContentFromAst,
    injectPreloadScript,
    scanForPreloadScript,
} from 'src';
import * as t from '@babel/types';
import {
    DEPRECATED_PRELOAD_SCRIPT_SRC,
    PRELOAD_SCRIPT_FILE_NAME,
    PRELOAD_SCRIPT_SRC,
} from '@onlook/constants';

const __dirname = import.meta.dir;

describe('injectPreloadScript', () => {
    const SHOULD_UPDATE_EXPECTED = false;
    const casesDir = path.resolve(__dirname, 'data/layout');

    const testCases = fs.readdirSync(casesDir);

    for (const testCase of testCases) {
        test(`should handle case: ${testCase}`, async () => {
            const caseDir = path.resolve(casesDir, testCase);
            const files = fs.readdirSync(caseDir);

            const inputFile = files.find((f) => f.startsWith('input.'));
            const expectedFile = files.find((f) => f.startsWith('expected.'));

            if (!inputFile || !expectedFile) {
                throw new Error(`Test case ${testCase} is missing input or expected file.`);
            }

            const inputPath = path.resolve(caseDir, inputFile);
            const expectedPath = path.resolve(caseDir, expectedFile);

            const inputContent = await Bun.file(inputPath).text();
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');
            const resultAst = injectPreloadScript(ast);
            const result = await getContentFromAst(resultAst, inputContent);

            if (SHOULD_UPDATE_EXPECTED) {
                await Bun.write(expectedPath, result);
            }

            const expectedContent = await Bun.file(expectedPath).text();
            expect(result).toBe(expectedContent);
        });
    }
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
            deprecatedScriptCount: 1,
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
        const bodyWithScript = createScriptElement(`/${PRELOAD_SCRIPT_FILE_NAME}`, 'body');
        const ast = createComponentWithJSX(bodyWithScript);

        const result = scanForPreloadScript(ast);

        expect(result.scriptCount).toBe(1);
        expect(result.deprecatedScriptCount).toBe(0);
        expect(result.injectedCorrectly).toBe(true);
    });

    test('should handle valid script outside body as not injected correctly', () => {
        const scriptElement = createScriptElement(`/${PRELOAD_SCRIPT_FILE_NAME}`);
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
                [t.jsxAttribute(t.jsxIdentifier('strategy'), t.stringLiteral('beforeInteractive'))],
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
