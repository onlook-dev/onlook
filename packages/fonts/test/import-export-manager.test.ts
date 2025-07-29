import { describe, test, expect } from 'bun:test';
import { generate, parse } from '@onlook/parser';
import {
    removeFontImportFromFile,
    addFontImportToFile,
} from '../src/helpers/import-export-manager';

const FONT_IMPORT_PATH = './fonts';

describe('removeFontImportFromFile', () => {
    test('removes a single named import (removes the whole line)', () => {
        const content = "import { Inter } from './fonts';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toBe('const x = 1;');
    });

    test('removes one of multiple named imports', () => {
        const content = "import { Inter, Roboto } from './fonts';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Roboto } from');
        expect(result).toContain('./fonts');
        expect(result).not.toContain('Inter');
    });

    test('removes a named import with alias', () => {
        const content = "import { Inter as MyInter, Roboto } from './fonts';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Roboto } from');
        expect(result).toContain('./fonts');
        expect(result).not.toContain('Inter as MyInter');
    });

    test('removes import with extra spaces and newlines', () => {
        const content = `import {\n  Inter,\n  Roboto\n} from './fonts';\nconst x = 1;`;
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('Roboto');
        expect(result).not.toContain('Inter');
    });

    test('returns null if import is not found', () => {
        const content = "import { Roboto } from './fonts';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toBeNull();
    });

    test('does not remove anything if import path does not match', () => {
        const content = "import { Inter } from 'next/font/local';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toBeNull();
    });
});

describe('addFontImportToFile', () => {
    test('creates new import statement when none exists', () => {
        const content = 'const Hello = () => { return <div>Hello</div>; }';
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Inter } from');
        expect(result).toContain('./fonts');
        expect(result?.indexOf('import')).toBe(0);
    });

    test('adds font to existing import statement', () => {
        const content =
            "import { Roboto } from './fonts';\nconst Hello = () => { return <div>Hello</div>; }";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Roboto, Inter } from');
        expect(result).toContain('./fonts');
    });

    test('returns null when font already exists in imports', () => {
        const content =
            "import { Inter, Roboto } from './fonts';\nconst Hello = () => { return <div>Hello</div>; }";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toBeNull();
    });

    test('adds font to existing import with multiple fonts', () => {
        const content =
            "import { Inter, Roboto } from './fonts';\nconst Hello = () => { return <div>Hello</div>; }";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Lato', ast);
        expect(result).toContain('import { Inter, Roboto, Lato } from');
        expect(result).toContain('./fonts');
    });

    test('handles imports with extra spaces and formatting', () => {
        const content = `import {\n  Inter,\n  Roboto\n} from './fonts';\nconst Hello = () => { return <div>Hello</div>; }`;
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Lato', ast);
        expect(result).toContain('Lato');
        expect(result).toContain('Inter');
        expect(result).toContain('Roboto');
    });

    test('does not add if import path does not match', () => {
        const content =
            "import { Inter } from 'next/font/local';\nconst Hello = () => { return <div>Hello</div>; }";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Roboto', ast);
        expect(result).toContain('import { Roboto } from');
        expect(result).toContain('./fonts');
        expect(result).toContain('import { Inter } from');
        expect(result).toContain('next/font/local');
    });

    test('handles empty file content', () => {
        const content = '';
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Inter } from');
        expect(result).toContain('./fonts');
        expect(result?.trim().startsWith('import')).toBe(true);
    });

    test('preserves existing code when adding new import', () => {
        const content = 'const Hello = () => { return <div>Hello</div>; }';
        const originalAst = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Inter } from');
        expect(result).toContain('./fonts');
        expect(result).toContain(generate(originalAst).code);
    });

    test('handles different quote styles in import path', () => {
        const content =
            'import { Roboto } from "./fonts";\nconst Hello = () => { return <div>Hello</div>; }';
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('Roboto');
        expect(result).toContain('Inter');
        expect(result).toContain('./fonts');
    });

    test('cleans up comma formatting when adding to imports', () => {
        const content =
            "import { Roboto, } from './fonts';\nconst Hello = () => { return <div>Hello</div>; }";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = addFontImportToFile(FONT_IMPORT_PATH, 'Inter', ast);
        expect(result).toContain('import { Roboto, Inter } from');
        expect(result).toContain('./fonts');
        expect(result).not.toContain('Roboto, ,');
    });
});
