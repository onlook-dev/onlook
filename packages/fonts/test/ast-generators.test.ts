import { generate } from '@onlook/parser';
import type { Font, FontConfig } from '@onlook/models';
import {
    generateFontVariableExport,
    createLocalFontConfig,
    createFontSrcObjects,
} from '../src/helpers/ast-generators';
import { runDataDrivenTests } from './test-utils';
import { describe } from 'bun:test';
import path from 'path';
import { types as t } from '@onlook/parser';

const __dirname = import.meta.dir;

describe('generateFontVariableExport', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/generate-font-variable-export'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        async (font: Font): Promise<string> => {
            const ast = generateFontVariableExport(font);
            return generate(ast).code;
        },
        (content: string): Font => {
            const config = JSON.parse(content);
            return config.font;
        },
    );
});

describe('createFontSrcObjects', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/create-font-src-objects'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        async (config: { sources: FontConfig[] }): Promise<string> => {
            const objects = createFontSrcObjects(config.sources);
            return generate(
                t.program([t.expressionStatement(t.arrayExpression(objects))]),
            ).code.trim();
        },
        (content: string): { sources: FontConfig[] } => {
            const config = JSON.parse(content);
            return config;
        },
    );
});

describe('createLocalFontConfig', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/create-local-font-config'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        async (config: { fontName: string; sources: FontConfig[] }): Promise<string> => {
            // Create a minimal AST with just the program body
            const ast = t.file(t.program([]));

            // Create font source objects
            const fontSrcObjects = createFontSrcObjects(config.sources);

            // Create local font config
            const resultAst = createLocalFontConfig(ast, config.fontName, fontSrcObjects);

            return generate(resultAst).code.trim();
        },
        (content: string): { fontName: string; sources: FontConfig[] } => {
            const config = JSON.parse(content);
            return config;
        },
    );
});
