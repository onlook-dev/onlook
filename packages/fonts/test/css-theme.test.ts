import { describe } from 'bun:test';
import type { Font } from '@onlook/models';
import { addFontToCssTheme, removeFontFromCssTheme } from '../src/helpers/css-theme';
import { runDataDrivenTests } from './test-utils';
import path from 'path';

const __dirname = import.meta.dir;

describe('addFontToCssTheme', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/css-theme/add-font-to-css-theme'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        async (input: { font: Font; content: string }) => {
            return addFontToCssTheme(input.font, input.content);
        },
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const inputContent = await Bun.file(
                path.resolve(path.dirname(filePath || ''), 'input.css'),
            ).text();
            return { font: config.font, content: inputContent };
        },
    );
});

describe('removeFontFromCssTheme', () => {
    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/css-theme/remove-font-from-css-theme'),
            inputFileName: 'config',
            expectedFileName: 'expected',
        },
        async (input: { fontId: string; content: string }) => {
            return removeFontFromCssTheme(input.fontId, input.content);
        },
        async (content: string, filePath?: string) => {
            const config = JSON.parse(content);
            const inputContent = await Bun.file(
                path.resolve(path.dirname(filePath || ''), 'input.css'),
            ).text();
            return { fontId: config.fontId, content: inputContent };
        },
    );
});
