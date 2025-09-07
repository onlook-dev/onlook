import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { handleGrepTool } from '../../src/components/tools/handlers/grep';
import type { EditorEngine } from '../../src/components/store/editor/engine';

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
} as any);

describe('Grep Tool', () => {
    let mockSandbox: any;
    let mockEngine: EditorEngine;

    beforeEach(() => {
        mockSandbox = createMockSandbox();
        mockEngine = createMockEditorEngine(mockSandbox);
    });

    afterEach(() => {
        // Reset mocks if needed
    });

    describe('handleGrepTool - Basic Functionality', () => {
        test('should handle sandbox not found', async () => {
            const engineWithoutSandbox = createMockEditorEngine(null);
            const args = {
                branchId: 'nonexistent',
                pattern: 'test',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, engineWithoutSandbox);
            expect(result).toBe('Error: Sandbox not found for branch ID: nonexistent');
        });

        test('should validate empty pattern', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: '',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Search pattern cannot be empty');
        });

        test('should validate whitespace-only pattern', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: '   ',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Search pattern cannot be empty');
        });

        test('should validate invalid regex pattern', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: '[invalid',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('Error: Invalid regex pattern');
            expect(result).toContain('[invalid');
        });

        test('should validate non-existent search path', async () => {
            mockSandbox = createMockSandbox({
                'test -e "nonexistent"': { success: true, output: 'not_found' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                path: 'nonexistent',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
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
                pattern: 'test',
                path: 'file.txt',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Search path "file.txt" is not a directory');
        });
    });

    describe('handleGrepTool - Parameter Validation', () => {
        beforeEach(() => {
            // Set up valid path for all parameter tests
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);
        });

        test('should validate -A parameter range', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e')) {
                    return Promise.resolve({ success: true, output: 'exists' });
                }
                if (command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: 'dir' });
                }
                return Promise.resolve({ success: true, output: '' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-A': -1,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: After context lines (-A) must be between 0 and 100, got -1');
        });

        test('should allow -A parameter of 0', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: '' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-A': 0,  // 0 should be valid for context lines
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'test\''); // Should pass validation and continue to search
        });

        test('should allow -B parameter of 0', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: '' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-B': 0,  // 0 should be valid for context lines
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'test\''); // Should pass validation and continue to search
        });

        test('should allow -C parameter of 0', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: '' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-C': 0,  // 0 should be valid for context lines
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'test\''); // Should pass validation and continue to search
        });

        test('should validate -B parameter range', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-B': 101,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Before context lines (-B) must be between 0 and 100, got 101');
        });

        test('should validate -C parameter range', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-C': -5,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Context lines (-C) must be between 0 and 100, got -5');
        });

        test('should validate head_limit range', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e')) {
                    return Promise.resolve({ success: true, output: 'exists' });
                }
                if (command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: 'dir' });
                }
                // Return success for any other command to get past path validation
                return Promise.resolve({ success: true, output: '' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                head_limit: 0,  // Now 0 should properly trigger validation
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Head limit must be between 1 and 10000, got 0');
        });

        test('should validate conflicting -C with -A/-B', async () => {
            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-C': 2,
                '-A': 1,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Cannot use -C (context) with -A (after) or -B (before) flags');
        });
    });

    describe('handleGrepTool - Search Execution', () => {
        test('should handle successful search with matches', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: 'src/file1.ts:match line 1\nsrc/file2.ts:match line 2' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('src/file1.ts:match line 1');
            expect(result).toContain('src/file2.ts:match line 2');
        });

        test('should handle search with no matches', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'nonexistent\'');
        });

        test('should handle case insensitive search', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: 'src/file.ts:Test Line' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                '-i': true,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('src/file.ts:Test Line');
        });

        test('should handle file type filtering', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: 'src/component.tsx:React component' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'React',
                type: 'tsx',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('src/component.tsx:React component');
        });

        test('should handle glob filtering', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: 'test/file.test.ts:test case' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                glob: '*.test.ts',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('test/file.test.ts:test case');
        });
    });

    describe('handleGrepTool - Output Modes', () => {
        beforeEach(() => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);
        });

        test('should handle files_with_matches mode', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: 'src/file1.ts\nsrc/file2.ts' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                output_mode: 'files_with_matches' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('src/file1.ts');
            expect(result).toContain('src/file2.ts');
        });

        test('should handle count mode', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: 'src/file1.ts:5\nsrc/file2.ts:3' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                output_mode: 'count' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('Total: 8 matches across 2 files');
            expect(result).toContain('src/file1.ts: 5 matches');
            expect(result).toContain('src/file2.ts: 3 matches');
        });

        test('should handle count mode with no matches', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('find')) {
                    return Promise.resolve({ success: true, output: 'src/file1.ts:0\nsrc/file2.ts:0' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent',
                output_mode: 'count' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for \'nonexistent\'');
        });
    });

    describe('handleGrepTool - Context Lines', () => {
        beforeEach(() => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);
        });

        test('should handle -A (after) context lines', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('-A 2')) {
                    return Promise.resolve({ 
                        success: true, 
                        output: 'src/file.ts:1:match line\nsrc/file.ts:2:after line 1\nsrc/file.ts:3:after line 2' 
                    });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-A': 2,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('match line');
            expect(result).toContain('after line 1');
            expect(result).toContain('after line 2');
        });

        test('should handle -B (before) context lines', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('-B 1')) {
                    return Promise.resolve({ 
                        success: true, 
                        output: 'src/file.ts:1:before line\nsrc/file.ts:2:match line' 
                    });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-B': 1,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('before line');
            expect(result).toContain('match line');
        });

        test('should handle -C (context) lines', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('-C 1')) {
                    return Promise.resolve({ 
                        success: true, 
                        output: 'src/file.ts:1:before\nsrc/file.ts:2:match\nsrc/file.ts:3:after' 
                    });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-C': 1,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('before');
            expect(result).toContain('match');
            expect(result).toContain('after');
        });

        test('should include line numbers when -n flag is set', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('-n')) {
                    return Promise.resolve({ 
                        success: true, 
                        output: 'src/file.ts:42:match line' 
                    });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-n': true,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('src/file.ts:42:match line');
        });

        test('should include -A 0 flag in grep command when zero after lines specified', async () => {
            let capturedCommand = '';
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    capturedCommand = command;
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-A': 0,
                output_mode: 'content' as const
            };

            await handleGrepTool(args, mockEngine);
            expect(capturedCommand).toContain('-A 0');
        });

        test('should include -B 0 flag in grep command when zero before lines specified', async () => {
            let capturedCommand = '';
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    capturedCommand = command;
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-B': 0,
                output_mode: 'content' as const
            };

            await handleGrepTool(args, mockEngine);
            expect(capturedCommand).toContain('-B 0');
        });

        test('should include -C 0 flag in grep command when zero context lines specified', async () => {
            let capturedCommand = '';
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    capturedCommand = command;
                    return Promise.resolve({ success: true, output: '' });
                }
                return Promise.resolve({ success: true, output: 'exists' });
            });

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                '-C': 0,
                output_mode: 'content' as const
            };

            await handleGrepTool(args, mockEngine);
            expect(capturedCommand).toContain('-C 0');
        });
    });

    describe('handleGrepTool - Multiline Support', () => {
        test('should handle multiline patterns with Perl regex support', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'grep --help | grep -q "\\-P"': { success: true, output: 'yes' },
                'find': { success: true, output: 'src/file.ts:multiline match' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'line1.*line2',  // Remove literal newlines to avoid validation error
                multiline: true,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('multiline match');
        });

        test('should fallback to awk for multiline without Perl support', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'grep --help | grep -q "\\-P"': { success: true, output: 'no' },
                'find': { success: true, output: 'src/file.ts:awk match' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'multiline',
                multiline: true,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('awk match');
        });

        test('should validate multiline patterns with literal newlines', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'line1\nline2',
                multiline: true,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('Error: Multiline patterns with literal newlines are not fully supported');
        });
    });

    describe('handleGrepTool - Result Processing', () => {
        test('should handle head limit truncation', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { 
                    success: true, 
                    output: Array.from({ length: 50 }, (_, i) => `file${i}.ts:match`).join('\n')
                }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'match',
                head_limit: 10,
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('truncated at 10');
        });

        test('should handle special characters in output', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { 
                    success: true, 
                    output: 'src/file.ts:line with \x07 bell and \x01 control' 
                }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'line',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).not.toContain('\x07');
            expect(result).not.toContain('\x01');
            expect(result).toContain('line with  bell and  control');
        });
    });

    describe('handleGrepTool - Error Handling', () => {
        test('should handle command execution errors gracefully', async () => {
            mockSandbox.session.runCommand.mockImplementation((command: string) => {
                if (command.includes('test -e') || command.includes('test -d')) {
                    return Promise.resolve({ success: true, output: command.includes('-d') ? 'dir' : 'exists' });
                }
                if (command.includes('find')) {
                    // Return failed command with no error message to test graceful handling
                    return Promise.resolve({ success: false, output: '' });
                }
                return Promise.resolve({ success: false, output: '', error: 'Command not found' });
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'test\'');
        });

        test('should handle unexpected errors', async () => {
            mockSandbox.session.runCommand.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'test',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toBe('Error: Unexpected error');
        });
    });

    describe('handleGrepTool - Path and Message Formatting', () => {
        test('should include search path in no-match message', async () => {
            mockSandbox = createMockSandbox({
                'test -e "src"': { success: true, output: 'exists' },
                'test -d "src"': { success: true, output: 'dir' },
                'find': { success: true, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent',
                path: 'src',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'nonexistent\' in path \'src\'');
        });

        test('should include file type filter in no-match message', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent',
                type: 'ts',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'nonexistent\' among ts files');
        });

        test('should include glob pattern in no-match message', async () => {
            mockSandbox = createMockSandbox({
                'test -e "."': { success: true, output: 'exists' },
                'test -d "."': { success: true, output: 'dir' },
                'find': { success: true, output: '' }
            });
            mockEngine = createMockEditorEngine(mockSandbox);

            const args = {
                branchId: 'test-branch',
                pattern: 'nonexistent',
                glob: '*.test.ts',
                output_mode: 'content' as const
            };

            const result = await handleGrepTool(args, mockEngine);
            expect(result).toContain('No matches found for text \'nonexistent\' among files matching \'*.test.ts\'');
        });
    });
});