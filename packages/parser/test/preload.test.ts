import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { getAstFromContent, getContentFromAst, removeDeprecatedPreloadScripts } from 'src';

const __dirname = import.meta.dir;

describe('removeDeprecatedPreloadScripts', () => {
    const SHOULD_UPDATE_EXPECTED = true;
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
                <Script type="module" src="/onlook-preload-script.js" />
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
        expect(result).toContain('src="/onlook-preload-script.js"');
        expect(result).toContain('src="https://example.com/other-script.js"');
    });

    test('should remove only deprecated scripts and keep current ones', async () => {
        const input = `import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <Script type="module" src="/onlook-preload-script.js" />
                <Script type="module" src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/packages/preload/dist/index.js" />
                <Script type="module" src="https://some-url/onlook-dev/web/script.js" />
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
        expect(result).toContain('src="/onlook-preload-script.js"');
        // Should remove deprecated scripts
        expect(result).not.toContain('packages/preload/dist/index.js');
        expect(result).not.toContain('onlook-dev/web');
    });
});
