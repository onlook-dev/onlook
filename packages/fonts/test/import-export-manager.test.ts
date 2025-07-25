import { describe, test, expect } from 'bun:test';
import { parse } from '@onlook/parser';
import { removeFontImportFromFile } from '../src/helpers/import-export-manager';

const FONT_IMPORT_PATH = 'next/font/google';

describe('removeFontImportFromFile', () => {
    test('removes a single named import (removes the whole line)', () => {
        const content = "import { Inter } from 'next/font/google';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toBe('const x = 1;');
    });

    test('removes one of multiple named imports', () => {
        const content = "import { Inter, Roboto } from 'next/font/google';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toContain("import { Roboto } from 'next/font/google'");
        expect(result).not.toContain('Inter');
    });

    test('removes a named import with alias', () => {
        const content =
            "import { Inter as MyInter, Roboto } from 'next/font/google';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toContain("import { Roboto } from 'next/font/google'");
        expect(result).not.toContain('Inter as MyInter');
    });

    test('removes import with extra spaces and newlines', () => {
        const content = `import {\n  Inter,\n  Roboto\n} from 'next/font/google';\nconst x = 1;`;
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toContain('Roboto');
        expect(result).not.toContain('Inter');
    });

    test('returns null if import is not found', () => {
        const content = "import { Roboto } from 'next/font/google';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toBeNull();
    });

    test('does not remove anything if import path does not match', () => {
        const content = "import { Inter } from 'next/font/local';\nconst x = 1;";
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        const result = removeFontImportFromFile(FONT_IMPORT_PATH, 'Inter', content, ast);
        expect(result).toBeNull();
    });
});
