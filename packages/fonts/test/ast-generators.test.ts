import { generate } from '@onlook/parser';
import type { Font } from '@onlook/models';
import { generateFontVariableExport } from '../src/helpers/ast-generators';
import { runDataDrivenTests } from './test-utils';
import { describe } from 'bun:test';
import path from 'path';

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
