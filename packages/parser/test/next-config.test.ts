import { CUSTOM_OUTPUT_DIR, JS_FILE_EXTENSIONS } from '@onlook/constants';
import { type FileOperations } from '@onlook/utility';
import { describe, expect, test } from 'bun:test';
import { getAstFromContent, getContentFromAst } from '../src';
import { addNextBuildConfig } from '../src/code-edit/next-config';

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
        test('should add config to basic next.config.js', async () => {
            const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.js': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.js');
            expect(modifiedContent).toContain('output: "standalone"');
            expect(modifiedContent).toContain('typescript: {');
            expect(modifiedContent).toContain('ignoreBuildErrors: true');
            expect(modifiedContent).toContain(
                `distDir: process.env.NODE_ENV === "production" ? "${CUSTOM_OUTPUT_DIR}" : ".next"`,
            );
        });

        test('should add config to next.config.ts', async () => {
            const configContent = `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.ts': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.ts');
            expect(modifiedContent).toContain('output: "standalone"');
            expect(modifiedContent).toContain('typescript: {');
            expect(modifiedContent).toContain('ignoreBuildErrors: true');
        });

        test('should add config to next.config.mjs', async () => {
            const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.mjs': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.mjs');
            expect(modifiedContent).toContain('output: "standalone"');
        });

        test('should not duplicate existing properties', async () => {
            const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './custom-tsconfig.json'
  },
  distDir: '.custom-dist'
}

module.exports = nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.js': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.js');

            // Should update existing values
            expect(modifiedContent).toContain('output: "standalone"');
            expect(modifiedContent).toContain('ignoreBuildErrors: true');
            expect(modifiedContent).toContain(
                `distDir: process.env.NODE_ENV === "production" ? "${CUSTOM_OUTPUT_DIR}" : ".next"`,
            );

            // Should preserve existing typescript properties
            expect(modifiedContent).toContain("tsconfigPath: './custom-tsconfig.json'");

            // Should only have one instance of each property
            expect((modifiedContent?.match(/output:/g) || []).length).toBe(1);
            expect((modifiedContent?.match(/typescript:/g) || []).length).toBe(1);
            expect((modifiedContent?.match(/distDir:/g) || []).length).toBe(1);
        });

        test('should merge typescript object properties', async () => {
            const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: './custom-tsconfig.json',
    typeChecking: true
  }
}

module.exports = nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.js': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.js');
            expect(modifiedContent).toContain('ignoreBuildErrors: true');
            expect(modifiedContent).toContain("tsconfigPath: './custom-tsconfig.json'");
            expect(modifiedContent).toContain('typeChecking: true');
        });

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

        test('should handle config with complex nested objects', async () => {
            const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client']
  },
  webpack: (config) => {
    return config;
  }
}

module.exports = nextConfig`;

            const fileOps = createMockFileOps({
                'next.config.js': configContent,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.js');
            expect(modifiedContent).toContain('output: "standalone"');
            expect(modifiedContent).toContain('experimental: {');
            expect(modifiedContent).toContain('appDir: true');
            expect(modifiedContent).toContain('webpack: config => {');
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
            const serialized = await getContentFromAst(ast);
            expect(serialized).toContain('reactStrictMode: true');
        });

        test('should handle empty config object', async () => {
            const emptyConfig = `const nextConfig = {}; module.exports = nextConfig;`;
            const fileOps = createMockFileOps({
                'next.config.js': emptyConfig,
            });

            const result = await addNextBuildConfig(fileOps);
            expect(result).toBe(true);

            const modifiedContent = await fileOps.readFile('next.config.js');
            expect(modifiedContent).toContain('output: "standalone"');
            expect(modifiedContent).toContain('typescript: {');
            expect(modifiedContent).toContain('ignoreBuildErrors: true');
        });
    });
});
