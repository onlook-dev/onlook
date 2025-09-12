import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { EditorEngine } from '../../src/components/store/editor/engine';
import { handleGlobTool } from '../../src/components/tools/handlers/glob';

// Mock sandbox and session for testing
const createMockSession = (commandResults: Record<string, { success: boolean; output: string; error?: string }>) => ({
    runCommand: mock((command: string, callback?: any, ignoreError?: boolean) => {
        // Find matching command pattern or return default
        for (const [pattern, result] of Object.entries(commandResults)) {
            if (command.includes(pattern)) {
                return Promise.resolve(result);
            }
        }
        // Default response for unknown commands
        return Promise.resolve({ success: false, output: '', error: 'Command not found' });
    })
});

const createMockSandbox = (commandResults: Record<string, any> = {}) => ({
    session: createMockSession(commandResults)
});

const createMockEditorEngine = (sandbox: any): EditorEngine => ({
    branches: {
        getSandboxById: mock((id: string) => sandbox)
    }
});

describe('Glob Tool', () => {
    let mockSandbox: any;
    let mockEngine: EditorEngine;

    beforeEach(() => {
        mockSandbox = createMockSandbox();
        mockEngine = createMockEditorEngine(mockSandbox);
    });

    afterEach(() => {
        // Reset mocks if needed
    });

    describe('handleGlobTool - Basic Functionality', () => {
        test('should handle sandbox not found', async () => {
            const engineWithoutSandbox = createMockEditorEngine(null);
            const args = {
                branchId: 'nonexistent',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, engineWithoutSandbox);
            expect(result).toBe('Error: Sandbox not found for branch ID: nonexistent');
        });

        test('should validate empty pattern', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: ''
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Pattern cannot be empty');
        });

        test('should validate whitespace-only pattern', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: '   '
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Pattern cannot be empty');
        });

        test('should validate obviously invalid patterns', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: 'test///'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Invalid pattern "test///". Check your glob syntax.');
        });

        test('should validate non-existent search path', async () => {
            mockSandbox = createMockSandbox({
                'test -e "nonexistent"': { success: true, output: 'not_found' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js',
                path: 'nonexistent'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Search path "nonexistent" does not exist');
        });

        test('should validate file instead of directory path', async () => {
            mockSandbox = createMockSandbox({
                'test -e "file.txt"': { success: true, output: 'exists' },
                'test -d "file.txt"': { success: true, output: 'not_dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js',
                path: 'file.txt'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Search path "file.txt" is not a directory');
        });
    });

    describe('handleGlobTool - Pattern Base Path Validation', () => {
        test('should validate pattern base path exists', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'test -d "nonexistent"': { success: true, output: 'not_found' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent/**/*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Pattern base path "nonexistent" does not exist');
        });

        test('should handle pattern with valid base path', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'test -d "src"': { success: true, output: 'exists' },
                'bash -c': { success: true, output: 'src/file1.js\nsrc/file2.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'src/**/*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('src/file1.js');
            expect(result).toContain('src/file2.js');
        });
    });

    describe('handleGlobTool - Glob Approaches', () => {
        test('should try bash first and succeed', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'src/file1.js\nsrc/file2.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '**/*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('src/file1.js');
            expect(result).toContain('src/file2.js');
        });

        test('should fallback to sh when bash fails', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: true, output: 'file1.js\nfile2.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('file1.js');
            expect(result).toContain('file2.js');
        });

        test('should fallback to find when bash and sh fail', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: true, output: 'src/component.tsx\nsrc/utils.tsx' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '**/*.tsx'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('src/component.tsx');
            expect(result).toContain('src/utils.tsx');
        });

        test('should skip sh for complex patterns', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'find': { success: true, output: 'src/file.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '**/*.{js,jsx}' // Complex pattern with brace expansion
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('src/file.js');

            // Verify sh was not called for complex pattern
            expect(mockSandbox.session.runCommand).not.toHaveBeenCalledWith(
                expect.stringContaining('sh -c'),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe('handleGlobTool - Pattern Types', () => {
        beforeEach(() => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);
        });

        test('should handle simple glob patterns', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('bash -c')) {
                    return Promise.resolve({ success: true, output: 'app.js\nutils.js' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('app.js');
            expect(result).toContain('utils.js');
        });

        test('should handle double-star recursive patterns', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('bash -c')) {
                    return Promise.resolve({ success: true, output: 'src/app.js\nsrc/utils/helper.js' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: '**/*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('src/app.js');
            expect(result).toContain('src/utils/helper.js');
        });

        test('should handle brace expansion patterns', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('bash -c')) {
                    return Promise.resolve({ success: false, output: '' }); // Bash fails, forces fallback to find
                }
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: 'component.tsx\nutils.ts' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: '*.{ts,tsx}'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('component.tsx');
            expect(result).toContain('utils.ts');
        });

        test('should handle question mark wildcards', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('bash -c')) {
                    return Promise.resolve({ success: true, output: 'test1.js\ntest2.js' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test?.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('test1.js');
            expect(result).toContain('test2.js');
        });

        test('should handle bracket expressions', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('bash -c')) {
                    return Promise.resolve({ success: true, output: 'file1.js\nfile2.js' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'file[12].js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('file1.js');
            expect(result).toContain('file2.js');
        });
    });

    describe('handleGlobTool - Path Handling', () => {
        test('should handle relative paths', async () => {
            mockSandbox = createMockSandbox({
                'test -e "src"': { success: true, output: 'exists' },
                'test -d "src"': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'src/component.tsx\nsrc/utils.tsx' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.tsx',
                path: 'src'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('src/component.tsx');
            expect(result).toContain('src/utils.tsx');
        });

        test('should handle current directory as default', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'app.js\nindex.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('app.js');
            expect(result).toContain('index.js');
        });
    });

    describe('handleGlobTool - Result Processing', () => {
        test('should handle no matches found', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: '' },
                'sh -c': { success: true, output: '' },
                'find': { success: false, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.nonexistent'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('No files found matching pattern "*.nonexistent" in path "."');
        });

        test('should filter out excluded directories', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'src/app.js\nnode_modules/lib.js\n.git/config\ndist/bundle.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '**/*'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('src/app.js');
            expect(result).not.toContain('node_modules/lib.js');
            expect(result).not.toContain('.git/config');
            expect(result).not.toContain('dist/bundle.js');
        });

        test('should handle truncation for large result sets', async () => {
            const largeOutput = Array.from({ length: 1500 }, (_, i) => `file${i}.js`).join('\n');

            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: largeOutput }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Showing first');
            expect(result).toContain('of 1000+ files (truncated)');
            expect(result).toContain('Please refine your pattern');
        });

        test('should clean up output formatting', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: './src/app.js\r\n./src/utils.js\r\n' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('src/app.js');
            expect(result).toContain('src/utils.js');
            expect(result).not.toContain('\r');
            expect(result).not.toContain('./');
        });

        test('should handle single file result', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'unique.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'unique.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('unique.js');
        });

        test('should handle multiple files result', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'file1.js\nfile2.js\nfile3.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 3 files:');
            expect(result).toContain('file1.js');
            expect(result).toContain('file2.js');
            expect(result).toContain('file3.js');
        });
    });

    describe('handleGlobTool - Find Command Fallback', () => {
        test('should handle brace expansion in find command', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: true, output: 'app.js\nutils.ts' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.{js,ts}'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('app.js');
            expect(result).toContain('utils.ts');
        });

        test('should handle double-star patterns in find command', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: true, output: 'src/deep/nested/file.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '**/file.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('src/deep/nested/file.js');
        });

        test('should handle simple patterns in find command', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: true, output: 'test.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('test.js');
        });
    });

    describe('handleGlobTool - Error Handling', () => {
        test('should handle all approaches failing', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: false, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('No files found matching pattern "*.js" in path "."');
        });

        test('should handle unexpected errors gracefully', async () => {
            mockSandbox.session.runCommand.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('Error: Unexpected error');
        });

        test('should handle malformed brace patterns', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: false, output: '' },
                'sh -c': { success: false, output: '' },
                'find': { success: true, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.{js'  // Missing closing brace
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('No files found matching pattern "*.{js" in path "."');
        });
    });

    describe('handleGlobTool - Edge Cases', () => {
        test('should handle empty output from successful commands', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: '   \n  \n   ' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.nonexistent'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toBe('No files found matching pattern "*.nonexistent" in path "."');
        });

        test('should handle patterns with spaces', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: 'my file.js' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'my*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 1 file:');
            expect(result).toContain('my file.js');
        });

        test('should handle mixed line endings and whitespace', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'bash -c': { success: true, output: '  file1.js  \r\n\n  file2.js  \n\r  ' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '*.js'
            };

            const result = await handleGlobTool(args, mockEngine);
            expect(result).toContain('Found 2 files:');
            expect(result).toContain('file1.js');
            expect(result).toContain('file2.js');
            expect(result).not.toContain('\r');
        });
    });
});