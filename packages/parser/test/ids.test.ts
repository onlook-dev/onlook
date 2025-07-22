import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { addOidsToAst, getAstFromContent, getContentFromAst } from 'src';

const __dirname = import.meta.dir;

const OBFUSCATED_ID = 'REPLACED_OIDS';

const sanitizeOids = (content: string) => {
    return content.replace(/data-oid="[^"]*"/g, `data-oid="${OBFUSCATED_ID}"`);
};

describe('addOidsToAst', () => {
    const SHOULD_UPDATE_EXPECTED = false;
    const casesDir = path.resolve(__dirname, 'data/ids');

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

            const { ast: astWithIds } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, inputContent);

            if (SHOULD_UPDATE_EXPECTED) {
                await Bun.write(expectedPath, result);
            }

            const expectedContent = await Bun.file(expectedPath).text();

            const sanitizedResult = sanitizeOids(result);
            const sanitizedExpected = sanitizeOids(expectedContent);

            expect(sanitizedResult).toBe(sanitizedExpected);
        });
    }
});
