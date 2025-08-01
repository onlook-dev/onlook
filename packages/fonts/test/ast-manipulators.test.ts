import { describe } from 'bun:test';
import { generate, parse } from '@onlook/parser';
import type { Font } from '@onlook/models';
import {
    removeFontDeclaration,
    addFontToTailwindTheme,
    removeFontFromTailwindTheme,
    addGoogleFontSpecifier,
    mergeLocalFontSources,
} from '../src/helpers/ast-manipulators';
import { findFontExportDeclaration } from '../src/helpers/validators';
import { runDataDrivenTests } from './test-utils';
import path from 'path';
import { createFontSrcObjects } from '../src/helpers/ast-generators';

const __dirname = import.meta.dir;

function makeDataDrivenTest<T>(
    testName: string,
    processor: (input: T) => Promise<string> | string,
    casesDir: string,
    parseInput: (config: any, inputContent: string) => T,
) {
    describe(testName, () => {
        runDataDrivenTests(
            {
                casesDir,
                inputFileName: 'config',
                expectedFileName: 'expected',
            },
            processor,
            async (content: string, filePath?: string) => {
                const config = JSON.parse(content);
                const testCaseDir = path.dirname(filePath || '');
                const inputPath = path.resolve(testCaseDir, 'input.tsx');
                try {
                    const inputContent = await Bun.file(inputPath).text();
                    return parseInput(config, inputContent);
                } catch (error) {
                    const testCaseName = path.basename(testCaseDir);
                    throw new Error(
                        `Failed to read input.tsx for test case ${testCaseName}: ${error}`,
                    );
                }
            },
        );
    });
}

makeDataDrivenTest(
    'removeFontDeclaration',
    async (input: { font: Font; content: string }) => {
        const result = removeFontDeclaration(input.font, input.content);
        return generate(result.ast).code;
    },
    path.resolve(__dirname, 'data/ast-manipulators/remove-font-declaration'),
    (config, inputContent) => ({ font: config.font, content: inputContent }),
);
makeDataDrivenTest(
    'addFontToTailwindTheme',
    async (input: { font: Font; content: string }) => {
        return addFontToTailwindTheme(input.font, input.content);
    },
    path.resolve(__dirname, 'data/ast-manipulators/add-font-to-tailwind-theme'),
    (config, inputContent) => ({ font: config.font, content: inputContent }),
);

makeDataDrivenTest(
    'removeFontFromTailwindTheme',
    async (input: { fontId: string; content: string }) => {
        return removeFontFromTailwindTheme(input.fontId, input.content);
    },
    path.resolve(__dirname, 'data/ast-manipulators/remove-font-from-tailwind-theme'),
    (config, inputContent) => ({ fontId: config.fontId, content: inputContent }),
);

makeDataDrivenTest(
    'addGoogleFontSpecifier',
    async (input: { importName: string; content: string }) => {
        const ast = parse(input.content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });
        addGoogleFontSpecifier(ast, input.importName);
        return generate(ast).code;
    },
    path.resolve(__dirname, 'data/ast-manipulators/add-google-font-specifier'),
    (config, inputContent) => ({ importName: config.importName, content: inputContent }),
);

makeDataDrivenTest(
    'mergeLocalFontSources',
    async (input: { fontName: string; newSources: any[]; content: string }) => {
        const ast = parse(input.content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const { existingFontNode } = findFontExportDeclaration(ast, input.fontName);
        if (!existingFontNode) {
            throw new Error(`Font export declaration for "${input.fontName}" not found`);
        }

        const fontsSrc = createFontSrcObjects(input.newSources);

        mergeLocalFontSources(ast, existingFontNode, input.fontName, fontsSrc);
        return generate(ast).code;
    },
    path.resolve(__dirname, 'data/ast-manipulators/merge-local-font-sources'),
    (config, inputContent) => ({
        fontName: config.fontName,
        newSources: config.newSources,
        content: inputContent,
    }),
);
