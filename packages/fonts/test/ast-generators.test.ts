import { generate } from '@onlook/parser';
import type { Font } from '@onlook/models';
import { generateFontVariableExport } from '../src/helpers/ast-generators';
import { runDataDrivenTests, type TestCaseConfig } from './test-utils';
import { describe } from 'bun:test';
import path from 'path';

const __dirname = import.meta.dir;

// Config parser for JSON font configurations
const parseConfig = (content: string): Font => {
    const config = JSON.parse(content);
    return config.font;
};

// Font processor that generates code from font config
const processFontConfig = async (font: Font): Promise<string> => {
    const ast = generateFontVariableExport(font);
    return generate(ast).code;
};

// Test configuration
const testConfig: TestCaseConfig = {
    casesDir: path.resolve(__dirname, 'data/generate-font-variable-export'),
    inputFileName: 'config',
    expectedFileName: 'expected',
};

// Create the test suite
describe('generateFontVariableExport', () => {
    runDataDrivenTests(testConfig, processFontConfig, parseConfig);
});
