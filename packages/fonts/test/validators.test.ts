import { describe, test, expect } from 'bun:test';
import { parse, traverse, types as t, type t as T, NodePath } from '@onlook/parser';
import {
    isTailwindThemeProperty,
    hasPropertyName,
    isValidLocalFontDeclaration,
    hasLocalFontImport,
    findFontExportDeclaration,
    validateGoogleFontSetup,
} from '../src/helpers/validators';

// Helper to get NodePath for a property
function getObjectPropertyPath(ast: T.File, key: string): NodePath<T.ObjectProperty> | null {
    let foundPath: NodePath<T.ObjectProperty> | null = null;
    traverse(ast, {
        ObjectProperty(path) {
            if (t.isIdentifier(path.node.key) && path.node.key.name === key) {
                foundPath = path;
                path.stop();
            }
        },
    });
    return foundPath;
}

describe('isTailwindThemeProperty', () => {
    test('returns true for theme property in object', () => {
        const ast = parse('const config = { theme: {} }');
        const path = getObjectPropertyPath(ast, 'theme');
        expect(path).not.toBeNull();
        if (path) expect(isTailwindThemeProperty(path)).toBe(true);
    });
    test('returns false for non-theme property', () => {
        const ast = parse('const config = { fontFamily: {} }');
        const path = getObjectPropertyPath(ast, 'fontFamily');
        expect(path).not.toBeNull();
        if (path) expect(isTailwindThemeProperty(path)).toBe(false);
    });
});

describe('hasPropertyName', () => {
    test('returns true for matching property name', () => {
        const ast = parse('const obj = { src: "foo" }');
        const path = getObjectPropertyPath(ast, 'src');
        expect(path).not.toBeNull();
        if (path && path.node) expect(hasPropertyName(path.node, 'src')).toBe(true);
    });
    test('returns false for non-matching property name', () => {
        const ast = parse('const obj = { variable: "bar" }');
        const path = getObjectPropertyPath(ast, 'variable');
        expect(path).not.toBeNull();
        if (path && path.node) expect(hasPropertyName(path.node, 'src')).toBe(false);
    });
});

describe('isValidLocalFontDeclaration', () => {
    test('returns true for valid localFont declaration', () => {
        const ast = parse('const myFont = localFont({ src: "foo.woff2" })');
        const declStmt = ast.program.body[0];
        if (t.isVariableDeclaration(declStmt)) {
            const decl = declStmt.declarations[0];
            expect(isValidLocalFontDeclaration(decl, 'myFont')).toBe(true);
        }
    });
    test('returns false for wrong variable name', () => {
        const ast = parse('const otherFont = localFont({ src: "foo.woff2" })');
        const declStmt = ast.program.body[0];
        if (t.isVariableDeclaration(declStmt)) {
            const decl = declStmt.declarations[0];
            expect(isValidLocalFontDeclaration(decl, 'myFont')).toBe(false);
        }
    });
    test('returns false for non-localFont call', () => {
        const ast = parse('const myFont = notLocalFont({ src: "foo.woff2" })');
        const declStmt = ast.program.body[0];
        if (t.isVariableDeclaration(declStmt)) {
            const decl = declStmt.declarations[0];
            expect(isValidLocalFontDeclaration(decl, 'myFont')).toBe(false);
        }
    });
    test('returns false for missing object config', () => {
        const ast = parse('const myFont = localFont()');
        const declStmt = ast.program.body[0];
        if (t.isVariableDeclaration(declStmt)) {
            const decl = declStmt.declarations[0];
            expect(isValidLocalFontDeclaration(decl, 'myFont')).toBe(false);
        }
    });
});

describe('hasLocalFontImport', () => {
    test('returns true if import exists', () => {
        const ast = parse("import localFont from 'next/font/local';", { sourceType: 'module' });
        expect(hasLocalFontImport(ast)).toBe(true);
    });
    test('returns false if import does not exist', () => {
        const ast = parse("import { Inter } from 'next/font/google';", { sourceType: 'module' });
        expect(hasLocalFontImport(ast)).toBe(false);
    });
});

describe('findFontExportDeclaration', () => {
    test('finds export declaration for font', () => {
        const ast = parse('export const myFont = localFont({ src: "foo.woff2" });', {
            sourceType: 'module',
        });
        const { fontNameExists, existingFontNode } = findFontExportDeclaration(ast, 'myFont');
        expect(fontNameExists).toBe(true);
        expect(existingFontNode).toBeTruthy();
    });
    test('returns false if export not found', () => {
        const ast = parse('export const otherFont = localFont({ src: "foo.woff2" });', {
            sourceType: 'module',
        });
        const { fontNameExists, existingFontNode } = findFontExportDeclaration(ast, 'myFont');
        expect(fontNameExists).toBe(false);
        expect(existingFontNode).toBeNull();
    });
});

describe('validateGoogleFontSetup', () => {
    const content = `import { Inter, Roboto } from 'next/font/google';
export const inter = Inter({ subsets: ['latin'] });`;
    test('returns all true for valid setup', () => {
        const result = validateGoogleFontSetup(content, 'Inter', 'inter');
        expect(result).toEqual({
            hasGoogleFontImport: true,
            hasImportName: true,
            hasFontExport: true,
        });
    });
    test('returns false for missing import', () => {
        const result = validateGoogleFontSetup('export const inter = Inter({})', 'Inter', 'inter');
        expect(result).toEqual({
            hasGoogleFontImport: false,
            hasImportName: false,
            hasFontExport: true,
        });
    });
    test('returns false for missing import name', () => {
        const result = validateGoogleFontSetup(
            'import { Roboto } from "next/font/google"; export const inter = Inter({})',
            'Inter',
            'inter',
        );
        expect(result).toEqual({
            hasGoogleFontImport: true,
            hasImportName: false,
            hasFontExport: true,
        });
    });
    test('returns false for missing export', () => {
        const result = validateGoogleFontSetup(
            'import { Inter } from "next/font/google";',
            'Inter',
            'inter',
        );
        expect(result).toEqual({
            hasGoogleFontImport: true,
            hasImportName: true,
            hasFontExport: false,
        });
    });
    test('returns all false for empty content', () => {
        const result = validateGoogleFontSetup('', 'Inter', 'inter');
        expect(result).toEqual({
            hasGoogleFontImport: false,
            hasImportName: false,
            hasFontExport: false,
        });
    });
});
