import { describe, expect, mock, test } from 'bun:test';

// Mock the path resolution utilities for unit testing
describe('Path Resolution Utilities (Unit Tests)', () => {
    // Mock sandbox session for controlled testing
    const createMockSession = (
        responses: Record<string, { success: boolean; output: string; error?: string }>,
    ) => ({
        runCommand: mock(async (command: string) => {
            // Find matching response based on command pattern
            for (const [pattern, response] of Object.entries(responses)) {
                if (command.includes(pattern) || new RegExp(pattern).test(command)) {
                    return response;
                }
            }
            return { success: false, output: '', error: 'Command not mocked' };
        }),
    });

    test('should resolve absolute paths correctly', async () => {
        const mockSession = createMockSession({
            'test -e "/absolute/path/file.txt"': { success: true, output: 'exists' },
        });

        // Simulate the resolvePath function logic
        const inputPath = '/absolute/path/file.txt';
        const result = await mockSession.runCommand(
            `test -e "${inputPath}" && echo "exists" || echo "not_found"`,
        );

        expect(result.success).toBe(true);
        expect(result.output).toBe('exists');
        expect(mockSession.runCommand).toHaveBeenCalledWith(
            'test -e "/absolute/path/file.txt" && echo "exists" || echo "not_found"',
        );
    });

    test('should resolve relative paths correctly', async () => {
        const mockSession = createMockSession({
            'test -e "relative/path"': { success: true, output: '/absolute/resolved/path' },
            realpath: { success: true, output: '/absolute/resolved/path' },
        });

        // Test relative path resolution
        const inputPath = 'relative/path';
        const testResult = await mockSession.runCommand(
            `test -e "${inputPath}" && realpath "${inputPath}" || echo "not_found"`,
        );

        expect(testResult.success).toBe(true);
        expect(testResult.output).toBe('/absolute/resolved/path');
    });

    test('should perform fuzzy path matching', async () => {
        const mockSession = createMockSession({
            'find . -name "\\*config\\*"': {
                success: true,
                output: './src/config.ts\n./config/database.js\n./app.config.json',
            },
            'realpath "./src/config.ts"': { success: true, output: '/full/path/src/config.ts' },
        });

        // Test fuzzy matching for 'config'
        const targetName = 'config';
        const findResult = await mockSession.runCommand(
            `find . -name "*${targetName}*" -type f -o -name "*${targetName}*" -type d | head -10`,
        );

        expect(findResult.success).toBe(true);

        const candidates = findResult.output.split('\n').filter((line) => line.trim());
        expect(candidates.length).toBe(3);
        expect(candidates[0]).toBe('./src/config.ts');

        // Test path resolution for best match
        const resolveResult = await mockSession.runCommand(`realpath "${candidates[0]}"`);
        expect(resolveResult.success).toBe(true);
        expect(resolveResult.output).toBe('/full/path/src/config.ts');
    });

    test('should score fuzzy matches correctly', () => {
        const targetName = 'config';
        const candidates = [
            './src/config.ts',
            './config/database.js',
            './app.config.json',
            './deep/nested/path/config-backup.ts',
        ];

        // Simulate scoring logic
        const scored = candidates.map((candidate) => {
            const candidateName = candidate.split('/').pop() || '';
            let score = 0;

            // Exact name match gets highest score
            if (candidateName === targetName) score += 100;
            // Partial match
            else if (candidateName.includes(targetName)) score += 50;
            // Case insensitive match
            else if (candidateName.toLowerCase().includes(targetName.toLowerCase())) score += 25;

            // Prefer shorter paths (less nested)
            score -= candidate.split('/').length;

            return { path: candidate, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // app.config.json should score highest (50 for partial match - 2 for path length = 48)
        // config.ts should score second (50 for partial match - 3 for path length = 47)
        expect(scored[0]?.path).toBe('./app.config.json');
        expect(scored[0]?.score).toBe(48);
        expect(scored[1]?.path).toBe('./src/config.ts');
        expect(scored[1]?.score).toBe(47);
    });

    test('should handle directory vs file detection', async () => {
        const mockSession = createMockSession({
            'test -d "/path/to/directory"': { success: true, output: 'dir' },
            'test -f "/path/to/file.txt"': { success: true, output: 'file' },
        });

        const dirResult = await mockSession.runCommand(
            'test -d "/path/to/directory" && echo "dir" || echo "not_dir"',
        );
        const fileResult = await mockSession.runCommand(
            'test -f "/path/to/file.txt" && echo "file" || echo "not_file"',
        );

        expect(dirResult.success).toBe(true);
        expect(dirResult.output).toBe('dir');
        expect(fileResult.success).toBe(true);
        expect(fileResult.output).toBe('file');
    });

    test('should handle find command with various options', async () => {
        const mockSession = createMockSession({
            'find "/test/dir" -maxdepth 1 -type f': {
                success: true,
                output: '/test/dir/file1.txt\n/test/dir/file2.js',
            },
            'find "/test/dir" -type f -o -type d': {
                success: true,
                output: '/test/dir/file1.txt\n/test/dir/subdir\n/test/dir/file2.js',
            },
            'find.*! -name "\\.\\*"': {
                success: true,
                output: '/test/dir/visible.txt\n/test/dir/also-visible.js',
            },
        });

        // Test non-recursive file listing
        const nonRecursiveResult = await mockSession.runCommand(
            'find "/test/dir" -maxdepth 1 -type f',
        );
        expect(nonRecursiveResult.success).toBe(true);
        expect(nonRecursiveResult.output.split('\n')).toHaveLength(2);

        // Test recursive listing with files and directories
        const recursiveResult = await mockSession.runCommand('find "/test/dir" -type f -o -type d');
        expect(recursiveResult.success).toBe(true);
        expect(recursiveResult.output.split('\n')).toHaveLength(3);

        // Test hidden files exclusion
        const visibleOnlyResult = await mockSession.runCommand(
            'find "/test/dir" -type f ! -name ".*"',
        );
        expect(visibleOnlyResult.success).toBe(true);
        expect(visibleOnlyResult.output.split('\n')).toHaveLength(2);
    });

    test('should handle ignore patterns correctly', async () => {
        const ignorePatterns = ['node_modules', '*.log', '.git'];

        // Build ignore command parts
        let findCommand = 'find "/test/dir"';
        for (const pattern of ignorePatterns) {
            findCommand += ` ! -path "*/${pattern}" ! -name "${pattern}"`;
        }

        expect(findCommand).toContain('! -path "*/node_modules"');
        expect(findCommand).toContain('! -name "*.log"');
        expect(findCommand).toContain('! -path "*/.git"');
    });

    test('should handle file content reading with line numbers', () => {
        const fileContent = 'line 1\nline 2\nline 3\nline 4\nline 5';
        const lines = fileContent.split('\n');

        // Test full content with line numbers
        const fullContent = lines.map((line, index) => `${index + 1}→${line}`).join('\n');
        expect(fullContent).toBe('1→line 1\n2→line 2\n3→line 3\n4→line 4\n5→line 5');

        // Test with offset and limit
        const offset = 2; // 0-based
        const limit = 2;
        const selectedLines = lines.slice(offset, offset + limit);
        const limitedContent = selectedLines
            .map((line, index) => `${offset + index + 1}→${line}`)
            .join('\n');
        expect(limitedContent).toBe('3→line 3\n4→line 4');
    });

    test('should handle large file truncation', () => {
        // Simulate file with more than 2000 lines
        const largeLines = Array.from({ length: 3000 }, (_, i) => `Line ${i + 1}`);
        const maxLines = 2000;

        expect(largeLines.length).toBe(3000);

        if (largeLines.length > maxLines) {
            const selectedLines = largeLines.slice(0, maxLines);
            const truncatedContent =
                selectedLines.map((line, index) => `${index + 1}→${line}`).join('\n') +
                `\n... (truncated, showing first ${maxLines} of ${largeLines.length} lines)`;

            expect(selectedLines.length).toBe(2000);
            expect(truncatedContent).toContain('... (truncated, showing first 2000 of 3000 lines)');
        }
    });
});

describe('Tool Parameter Processing (Unit Tests)', () => {
    test('should handle list files parameters correctly', () => {
        const baseParams = {
            branchId: 'test-branch',
        };

        const fullParams = {
            path: '/test/directory',
            recursive: true,
            show_hidden: false,
            file_types_only: true,
            ignore: ['node_modules', '*.tmp'],
            branchId: 'test-branch',
        };

        // Test parameter processing logic
        const processListParams = (params: typeof fullParams) => {
            const resolvedPath = params.path || '.';
            let findCommand = `find "${resolvedPath}"`;

            if (!params.recursive) {
                findCommand += ' -maxdepth 1';
            }

            if (params.file_types_only) {
                findCommand += ' -type f';
            } else {
                findCommand += ' -type f -o -type d';
            }

            if (!params.show_hidden) {
                findCommand += ' ! -name ".*"';
            }

            if (params.ignore) {
                for (const pattern of params.ignore) {
                    findCommand += ` ! -path "*/${pattern}" ! -name "${pattern}"`;
                }
            }

            return findCommand;
        };

        const baseCommand = processListParams({
            ...baseParams,
            recursive: false,
            show_hidden: false,
            file_types_only: false,
            path: '.',
            ignore: [],
        });
        const fullCommand = processListParams(fullParams);

        expect(baseCommand).toBe('find "." -maxdepth 1 -type f -o -type d ! -name ".*"');
        expect(fullCommand).toContain('find "/test/directory"');
        expect(fullCommand).toContain('-type f');
        expect(fullCommand).toContain('! -path "*/node_modules"');
        expect(fullCommand).toContain('! -name "*.tmp"');
        expect(fullCommand).not.toContain('-maxdepth 1'); // recursive is true
    });

    test('should handle read file parameters correctly', () => {
        const baseParams = {
            file_path: '/test/file.txt',
            branchId: 'test-branch',
        };

        const offsetParams = {
            file_path: '/test/file.txt',
            offset: 10,
            limit: 20,
            branchId: 'test-branch',
        };

        // Test parameter processing
        const processReadParams = (params: {
            file_path: string;
            offset?: number;
            limit?: number;
            branchId: string;
        }) => {
            if (params.offset || params.limit) {
                const start = Math.max(0, (params.offset || 1) - 1); // Convert to 0-based indexing
                const end = params.limit ? start + params.limit : undefined;
                return { start, end };
            }
            return { start: 0, end: undefined };
        };

        const baseResult = processReadParams(baseParams);
        const offsetResult = processReadParams(offsetParams);

        expect(baseResult).toEqual({ start: 0, end: undefined });
        expect(offsetResult).toEqual({ start: 9, end: 29 }); // offset 10 becomes start 9, limit 20 -> end 29
    });
});
