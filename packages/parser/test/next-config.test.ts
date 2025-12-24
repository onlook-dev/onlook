import { JS_FILE_EXTENSIONS } from '@onlook/constants';
import { type FileOperations } from '@onlook/utility';
import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { getAstFromContent, getContentFromAst } from '../src';
import { addNextBuildConfig } from '../src/code-edit/next-config';

const __dirname = import.meta.dir;

describe('Build Config Tests', () => {
    // Mock FileOperations for testing
    const createMockFileOps = (configFiles: Record<string, string>): FileOperations => {
        let files = { ...configFiles };

        return {
            readFile: async (filePath: string) => {
                return files[filePath] || null;
            },
            writeFile: async (filePath: string, content: string) => {
                files[filePath] = content;
                return true;
            },
            fileExists: async (filePath: string) => {
                return filePath in files;
            },
            delete: async (filePath: string) => {
                delete files[filePath];
                return true;
            },
            copy: async () => true,
        };
    };

    describe('addNextBuildConfig', () => {
        const SHOULD_UPDATE_EXPECTED = false;
        const casesDir = path.resolve(__dirname, 'data/next-config');
        const testCases = fs.readdirSync(casesDir);

        for (const testCase of testCases) {
            test(`should handle case: ${testCase}`, async () => {
                const caseDir = path.resolve(casesDir, testCase);
                const files = fs.readdirSync(caseDir);

                const inputFile = files.find((f) => f.startsWith('input.'));
                const expectedFile = files.find((f) => f.startsWith('expected.'));

                if (!inputFile || !expectedFile) {
                    throw new Error(`Test case ${testCase} is missing input or expected file.`);
                }

                const inputPath = path.resolve(caseDir, inputFile);
                const expectedPath = path.resolve(caseDir, expectedFile);

                const extension = path.extname(inputFile);
                const configFilename = `next.config${extension}`;

                const configContent = await Bun.file(inputPath).text();
                const fileOps = createMockFileOps({ [configFilename]: configContent });

                const result = await addNextBuildConfig(fileOps);
                expect(result).toBe(true);

                const modifiedContent = await fileOps.readFile(configFilename);

                if (SHOULD_UPDATE_EXPECTED) {
                    await Bun.write(expectedPath, modifiedContent as string);
                }

                const expectedContent = await Bun.file(expectedPath).text();
                expect(modifiedContent).toBe(expectedContent);
            });
        }

        test('should return false when no config file exists', async () => {
            const fileOps = createMockFileOps({});
            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(false);
        });

        test('should return false when config file is empty', async () => {
            const fileOps = createMockFileOps({
                'next.config.js': '',
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(false);
        });

        test('should return false when readFile returns null', async () => {
            const fileOps: FileOperations = {
                readFile: async () => null,
                writeFile: async () => true,
                fileExists: async () => true,
                delete: async () => true,
                copy: async () => true,
            };

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(false);
        });

        test('should return false when writeFile fails', async () => {
            const fileOps: FileOperations = {
                readFile: async () => 'const nextConfig = {}; module.exports = nextConfig;',
                writeFile: async () => false,
                fileExists: async () => true,
                delete: async () => true,
                copy: async () => true,
            };

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(false);
        });

        test('should handle malformed config files gracefully', async () => {
            const fileOps = createMockFileOps({
                'next.config.js': 'this is not valid javascript {',
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(false);
        });

        test('should prioritize files by extension order', async () => {
            // Create multiple config files
            const fileOps = createMockFileOps({
                'next.config.js':
                    'const nextConfig = {existing: "js"}; module.exports = nextConfig;',
                'next.config.ts': 'const nextConfig = {existing: "ts"}; export default nextConfig;',
                'next.config.mjs':
                    'const nextConfig = {existing: "mjs"}; export default nextConfig;',
                'next.config.cjs':
                    'const nextConfig = {existing: "cjs"}; module.exports = nextConfig;',
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            // Should pick the first one found based on JS_FILE_EXTENSIONS order
            const firstExtension = JS_FILE_EXTENSIONS[0];
            const expectedFile = `next.config${firstExtension}`;
            const modifiedContent = await fileOps.readFile(expectedFile);
            expect(modifiedContent).toContain('output: "standalone"');
        });
    });

    describe('Config Property Addition Logic', () => {
        test('should correctly parse and modify config AST', async () => {
            const simpleConfig = `const nextConfig = { reactStrictMode: true }; module.exports = nextConfig;`;
            const ast = getAstFromContent(simpleConfig);
            expect(ast).toBeDefined();
            if (!ast) {
                throw new Error('Failed to get ast');
            }
            // Test that we can serialize it back
            const serialized = await getContentFromAst(ast, simpleConfig);
            expect(serialized).toContain('reactStrictMode: true');
        });
    });
});
