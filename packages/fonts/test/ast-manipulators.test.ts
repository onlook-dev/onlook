import { describe } from 'bun:test';
import { generate, parse } from '@onlook/parser';
import type { Font } from '@onlook/models';
import {
    removeFontDeclaration,
    addFontToTailwindTheme,
    removeFontFromTailwindTheme,
    addGoogleFontSpecifier,
} from '../src/helpers/ast-manipulators';
import { runDataDrivenTests, type TestCaseConfig } from './test-utils';
import path from 'path';

const __dirname = import.meta.dir;

// Test removeFontDeclaration function
describe('removeFontDeclaration', () => {
    const parseRemoveFontConfig = (content: string): Font => {
        const config = JSON.parse(content);
        return config.font;
    };

    const processRemoveFontDeclaration = async (input: {
        font: Font;
        content: string;
    }): Promise<string> => {
        const result = removeFontDeclaration(input.font, input.content);
        return generate(result.ast).code;
    };

    // Custom input parser for removeFontDeclaration tests
    const parseRemoveFontInput = async (
        configContent: string,
    ): Promise<{ font: Font; content: string }> => {
        const font = parseRemoveFontConfig(configContent);

        // Read the input.tsx file from the same directory
        const configPath = path.dirname(configContent);
        const inputPath = path.resolve(configPath, 'input.tsx');
        const content = await Bun.file(inputPath).text();

        return { font, content };
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/ast-manipulators/remove-font-declaration'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        processRemoveFontDeclaration,
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const font: Font = config.font;

            // Extract test case name from the config file path
            const configPath = filePath || '';
            const testCaseName = path.basename(path.dirname(configPath));

            // Read the input.tsx file from the same test case directory
            const testCaseDir = path.dirname(configPath);
            const inputPath = path.resolve(testCaseDir, 'input.tsx');

            try {
                const inputContent = await Bun.file(inputPath).text();
                return { font, content: inputContent };
            } catch (error) {
                throw new Error(`Failed to read input.tsx for test case ${testCaseName}: ${error}`);
            }
        },
    );
});

// Test addFontToTailwindTheme function
describe('addFontToTailwindTheme', () => {
    const processAddFontToTailwind = async (input: {
        font: Font;
        content: string;
    }): Promise<string> => {
        return addFontToTailwindTheme(input.font, input.content);
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/ast-manipulators/add-font-to-tailwind-theme'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        processAddFontToTailwind,
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const font: Font = config.font;

            // Extract test case name from the config file path
            const configPath = filePath || '';
            const testCaseName = path.basename(path.dirname(configPath));

            // Read the input.tsx file from the same test case directory
            const testCaseDir = path.dirname(configPath);
            const inputPath = path.resolve(testCaseDir, 'input.tsx');

            try {
                const inputContent = await Bun.file(inputPath).text();
                return { font, content: inputContent };
            } catch (error) {
                throw new Error(`Failed to read input.tsx for test case ${testCaseName}: ${error}`);
            }
        },
    );
});

// Test removeFontFromTailwindTheme function
describe('removeFontFromTailwindTheme', () => {
    const processRemoveFontFromTailwind = async (input: {
        fontId: string;
        content: string;
    }): Promise<string> => {
        return removeFontFromTailwindTheme(input.fontId, input.content);
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(
                __dirname,
                'data/ast-manipulators/remove-font-from-tailwind-theme',
            ),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        processRemoveFontFromTailwind,
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const fontId: string = config.fontId;

            // Extract test case name from the config file path
            const configPath = filePath || '';
            const testCaseName = path.basename(path.dirname(configPath));

            // Read the input.tsx file from the same test case directory
            const testCaseDir = path.dirname(configPath);
            const inputPath = path.resolve(testCaseDir, 'input.tsx');

            try {
                const inputContent = await Bun.file(inputPath).text();
                return { fontId, content: inputContent };
            } catch (error) {
                throw new Error(`Failed to read input.tsx for test case ${testCaseName}: ${error}`);
            }
        },
    );
});

// Test addGoogleFontSpecifier function
describe('addGoogleFontSpecifier', () => {
    const processAddGoogleFontSpecifier = async (input: {
        importName: string;
        content: string;
    }): Promise<string> => {
        const ast = parse(input.content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        addGoogleFontSpecifier(ast, input.importName);

        return generate(ast).code;
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/ast-manipulators/add-google-font-specifier'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        processAddGoogleFontSpecifier,
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const importName: string = config.importName;

            // Extract test case name from the config file path
            const configPath = filePath || '';
            const testCaseName = path.basename(path.dirname(configPath));

            // Read the input.tsx file from the same test case directory
            const testCaseDir = path.dirname(configPath);
            const inputPath = path.resolve(testCaseDir, 'input.tsx');

            try {
                const inputContent = await Bun.file(inputPath).text();
                return { importName, content: inputContent };
            } catch (error) {
                throw new Error(`Failed to read input.tsx for test case ${testCaseName}: ${error}`);
            }
        },
    );
});
