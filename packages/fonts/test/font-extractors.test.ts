import { describe, test, expect } from 'bun:test';
import {
    parseFontDeclarations,
    buildFontConfiguration,
    migrateFontsFromLayout,
} from '../src/helpers/font-extractors';
import { runDataDrivenTests } from './test-utils';
import { parse, traverse, type t as T } from '@onlook/parser';
import path from 'path';

const __dirname = import.meta.dir;

describe('parseFontDeclarations', () => {
    const processParseFontDeclarations = (content: string): string => {
        const fonts = parseFontDeclarations(content);
        return JSON.stringify(fonts, null, 4);
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/font-extractors/parse-font-declarations'),
            inputFileName: 'input',
            expectedFileName: 'expected',
        },
        processParseFontDeclarations,
    );

    test('should handle empty content', () => {
        const result = parseFontDeclarations('');
        expect(result).toEqual([]);
    });

    test('should handle content with no font imports', () => {
        const content = `
            import React from 'react';
            const Component = () => <div>Hello</div>;
        `;
        const result = parseFontDeclarations(content);
        expect(result).toEqual([]);
    });

    test('should handle invalid syntax gracefully', () => {
        const content = 'invalid javascript syntax {';
        expect(() => parseFontDeclarations(content)).toThrow();
    });
});

describe('buildFontConfiguration', () => {
    test('should build Google font configuration', () => {
        const content = `
            const config = {
                subsets: ['latin', 'latin-ext'],
                weight: ['400', '700'],
                style: ['normal', 'italic'],
                variable: '--font-inter',
                display: 'swap'
            };
        `;
        const ast = parse(content);
        let configArg: T.ObjectExpression | null = null;

        // Extract the object expression from the AST
        traverse(ast, {
            ObjectExpression(path) {
                configArg = path.node;
                path.stop();
            },
        });

        if (configArg) {
            const result = buildFontConfiguration('inter', 'Inter', configArg);
            expect(result).toEqual({
                id: 'inter',
                family: 'Inter',
                type: 'google',
                subsets: ['latin', 'latin-ext'],
                weight: ['400', '700'],
                styles: ['normal', 'italic'],
                variable: '--font-inter',
            });
        } else {
            throw new Error('Could not find object expression in test AST');
        }
    });

    test('should build local font configuration', () => {
        const content = `
            const config = {
                src: [
                    { path: './fonts/custom-regular.woff2', weight: '400', style: 'normal' },
                    { path: './fonts/custom-bold.woff2', weight: '700', style: 'normal' }
                ],
                variable: '--font-custom',
                display: 'swap'
            };
        `;
        const ast = parse(content);
        let configArg: T.ObjectExpression | null = null;

        // Extract the object expression from the AST
        traverse(ast, {
            ObjectExpression(path) {
                configArg = path.node;
                path.stop();
            },
        });

        if (configArg) {
            const result = buildFontConfiguration('customFont', 'localFont', configArg);
            expect(result).toEqual({
                id: 'customFont',
                family: 'customFont',
                type: 'local',
                subsets: [],
                weight: ['400', '700'],
                styles: ['normal'],
                variable: '--font-custom',
            });
        } else {
            throw new Error('Could not find object expression in test AST');
        }
    });

    test('should handle empty configuration object', () => {
        const content = 'const config = {};';
        const ast = parse(content);
        let configArg: T.ObjectExpression | null = null;

        traverse(ast, {
            ObjectExpression(path) {
                configArg = path.node;
                path.stop();
            },
        });

        if (configArg) {
            const result = buildFontConfiguration('testFont', 'TestFont', configArg);
            expect(result).toEqual({
                id: 'testFont',
                family: 'TestFont',
                type: 'google',
                subsets: [],
                weight: [],
                styles: [],
                variable: '',
            });
        }
    });
});

describe('migrateFontsFromLayout', () => {
    const processMigrateFontsFromLayout = (content: string): string => {
        const result = migrateFontsFromLayout(content);
        return JSON.stringify(
            {
                layoutContent: result.layoutContent,
                fonts: result.fonts,
            },
            null,
            4,
        );
    };

    runDataDrivenTests(
        {
            casesDir: path.resolve(__dirname, 'data/font-extractors/migrate-fonts-from-layout'),
            inputFileName: 'input',
            expectedFileName: 'expected',
        },
        processMigrateFontsFromLayout,
    );

    test('should handle layout with no fonts', () => {
        const content = `
            import React from 'react';
            
            export default function Layout({ children }: { children: React.ReactNode }) {
                return (
                    <html>
                        <body>{children}</body>
                    </html>
                );
            }
        `;

        const result = migrateFontsFromLayout(content);
        expect(result.fonts).toEqual([]);
        expect(result.layoutContent).toContain("import React from 'react';");
    });

    test('should handle invalid syntax gracefully', () => {
        const content = 'invalid javascript syntax {';
        const result = migrateFontsFromLayout(content);
        expect(result.layoutContent).toBe(content);
        expect(result.fonts).toEqual([]);
    });

    test('should generate default variable if not provided', () => {
        const content = `
            import { Inter } from 'next/font/google';
            
            export const inter = Inter({
                subsets: ['latin'],
                weight: ['400']
            });
        `;

        const result = migrateFontsFromLayout(content);
        expect(result.fonts).toHaveLength(1);
        expect(result.fonts[0].variable).toBe('--font-inter');
    });
});
