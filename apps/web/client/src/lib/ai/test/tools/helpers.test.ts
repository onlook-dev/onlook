import { describe, expect, test } from 'bun:test';
import {
    DEFAULT_EXCLUDED_PATTERNS,
    FILE_TYPE_MAP,
    buildShellExclusionPattern,
    addFindExclusions,
    filterExcludedPaths,
    getFileTypePattern,
    escapeForShell,
    isPathExcluded
} from '@onlook/ai/src/tools/shared/helpers/cli';

describe('Tool Helpers', () => {
    describe('DEFAULT_EXCLUDED_PATTERNS', () => {
        test('should contain common directories and files to exclude', () => {
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('node_modules');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('.git');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('.next');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('dist');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('build');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('*.log');
            expect(DEFAULT_EXCLUDED_PATTERNS).toContain('.DS_Store');
        });

        test('should be an array of strings', () => {
            expect(Array.isArray(DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
            DEFAULT_EXCLUDED_PATTERNS.forEach(pattern => {
                expect(typeof pattern).toBe('string');
            });
        });
    });

    describe('FILE_TYPE_MAP', () => {
        test('should map common file types to extensions', () => {
            expect(FILE_TYPE_MAP.js).toBe('*.js');
            expect(FILE_TYPE_MAP.ts).toBe('*.ts');
            expect(FILE_TYPE_MAP.jsx).toBe('*.jsx');
            expect(FILE_TYPE_MAP.tsx).toBe('*.tsx');
            expect(FILE_TYPE_MAP.py).toBe('*.py');
            expect(FILE_TYPE_MAP.java).toBe('*.java');
        });

        test('should handle various programming languages', () => {
            expect(FILE_TYPE_MAP.rust).toBe('*.rs');
            expect(FILE_TYPE_MAP.go).toBe('*.go');
            expect(FILE_TYPE_MAP.cpp).toBe('*.cpp');
            expect(FILE_TYPE_MAP.html).toBe('*.html');
            expect(FILE_TYPE_MAP.css).toBe('*.css');
            expect(FILE_TYPE_MAP.json).toBe('*.json');
        });
    });

    describe('buildShellExclusionPattern', () => {
        test('should build exclusion pattern for default patterns', () => {
            const pattern = buildShellExclusionPattern();
            expect(pattern).toContain('[[ "$f" != */node_modules/* ]]');
            expect(pattern).toContain('[[ "$f" != */.git/* ]]');
            expect(pattern).toContain('[[ "$f" != *.log ]]');
            expect(pattern).toContain('&&');
        });

        test('should handle custom exclusion patterns', () => {
            const customPatterns = ['test', '*.tmp'];
            const pattern = buildShellExclusionPattern(customPatterns);
            expect(pattern).toContain('[[ "$f" != */test/* ]]');
            expect(pattern).toContain('[[ "$f" != *.tmp ]]');
        });

        test('should handle patterns with wildcards differently', () => {
            const patterns = ['test_dir', '*.log'];
            const pattern = buildShellExclusionPattern(patterns);
            
            // Wildcard pattern
            expect(pattern).toContain('[[ "$f" != *.log ]]');
            // Regular directory pattern
            expect(pattern).toContain('[[ "$f" != */test_dir/* ]]');
            expect(pattern).toContain('[[ "$(basename "$f")" != "test_dir" ]]');
        });

        test('should join conditions with &&', () => {
            const patterns = ['dir1', 'dir2'];
            const pattern = buildShellExclusionPattern(patterns);
            expect(pattern.includes('&&')).toBe(true);
        });

        test('should handle empty patterns array', () => {
            const pattern = buildShellExclusionPattern([]);
            expect(pattern).toBe('');
        });

        test('should handle single pattern', () => {
            const pattern = buildShellExclusionPattern(['test']);
            expect(pattern).toContain('[[ "$f" != */test/* ]]');
            expect(pattern).toContain('[[ "$(basename "$f")" != "test" ]]');
            expect(pattern).toContain('&&'); // Single non-wildcard patterns still use && for path and basename checks
        });
    });

    describe('addFindExclusions', () => {
        test('should add exclusions to find command', () => {
            const command = addFindExclusions('find . -type f');
            expect(command).toContain('-not -path "*/node_modules/*"');
            expect(command).toContain('-not -name "node_modules"');
            expect(command).toContain('-not -path "*/.git/*"');
            expect(command).toContain('-not -name "*.log"');
        });

        test('should handle custom exclusion patterns', () => {
            const customPatterns = ['test', '*.tmp'];
            const command = addFindExclusions('find . -type f', customPatterns);
            expect(command).toContain('-not -path "*/test/*"');
            expect(command).toContain('-not -name "test"');
            expect(command).toContain('-not -name "*.tmp"');
        });

        test('should handle patterns with wildcards', () => {
            const patterns = ['*.log', 'cache'];
            const command = addFindExclusions('find . -type f', patterns);
            expect(command).toContain('-not -name "*.log"');
            expect(command).toContain('-not -path "*/cache/*"');
            expect(command).toContain('-not -name "cache"');
        });

        test('should preserve original find command', () => {
            const originalCommand = 'find /some/path -type f';
            const command = addFindExclusions(originalCommand, ['test']);
            expect(command).toContain(originalCommand);
        });

        test('should handle empty exclusions', () => {
            const originalCommand = 'find . -type f';
            const command = addFindExclusions(originalCommand, []);
            expect(command).toBe(originalCommand);
        });
    });

    describe('filterExcludedPaths', () => {
        test('should filter out excluded paths', () => {
            const paths = [
                'src/index.ts',
                'node_modules/lib/index.js',
                'src/utils.ts',
                '.git/config',
                'dist/bundle.js',
                'app.log'
            ];
            
            const filtered = filterExcludedPaths(paths);
            expect(filtered).toContain('src/index.ts');
            expect(filtered).toContain('src/utils.ts');
            expect(filtered).not.toContain('node_modules/lib/index.js');
            expect(filtered).not.toContain('.git/config');
            expect(filtered).not.toContain('dist/bundle.js');
        });

        test('should handle custom exclusion patterns', () => {
            const paths = ['src/file.ts', 'test/file.test.ts', 'docs/readme.md'];
            const customPatterns = ['test', 'docs'];
            
            const filtered = filterExcludedPaths(paths, customPatterns);
            expect(filtered).toContain('src/file.ts');
            expect(filtered).not.toContain('test/file.test.ts');
            expect(filtered).not.toContain('docs/readme.md');
        });

        test('should handle nested paths correctly', () => {
            const paths = [
                'project/src/index.ts',
                'project/node_modules/lib/index.js',
                'project/build/dist/app.js'
            ];
            
            const filtered = filterExcludedPaths(paths);
            expect(filtered).toContain('project/src/index.ts');
            expect(filtered).not.toContain('project/node_modules/lib/index.js');
            expect(filtered).not.toContain('project/build/dist/app.js');
        });

        test('should handle paths with dots correctly', () => {
            const paths = [
                'src/.env.example',
                '.git/hooks/pre-commit',
                '.DS_Store',
                'src/.gitignore'
            ];
            
            const filtered = filterExcludedPaths(paths);
            expect(filtered).toContain('src/.env.example');
            expect(filtered).toContain('src/.gitignore');
            expect(filtered).not.toContain('.git/hooks/pre-commit');
            expect(filtered).not.toContain('.DS_Store');
        });

        test('should return empty array for empty input', () => {
            const filtered = filterExcludedPaths([]);
            expect(filtered).toEqual([]);
        });

        test('should return all paths if no exclusions match', () => {
            const paths = ['src/app.ts', 'lib/utils.ts'];
            const customPatterns = ['nonexistent'];
            const filtered = filterExcludedPaths(paths, customPatterns);
            expect(filtered).toEqual(paths);
        });
    });

    describe('getFileTypePattern', () => {
        test('should return pattern for known file types', () => {
            expect(getFileTypePattern('js')).toBe('*.js');
            expect(getFileTypePattern('ts')).toBe('*.ts');
            expect(getFileTypePattern('tsx')).toBe('*.tsx');
            expect(getFileTypePattern('py')).toBe('*.py');
            expect(getFileTypePattern('rust')).toBe('*.rs');
        });

        test('should return custom pattern for unknown file types', () => {
            expect(getFileTypePattern('custom')).toBe('*.custom');
            expect(getFileTypePattern('xyz')).toBe('*.xyz');
            expect(getFileTypePattern('unknown')).toBe('*.unknown');
        });

        test('should handle empty string', () => {
            expect(getFileTypePattern('')).toBe('*.');
        });

        test('should handle special characters in type', () => {
            expect(getFileTypePattern('test-type')).toBe('*.test-type');
            expect(getFileTypePattern('type_1')).toBe('*.type_1');
        });
    });

    describe('escapeForShell', () => {
        test('should escape backticks', () => {
            expect(escapeForShell('echo `date`')).toBe('echo \\`date\\`');
        });

        test('should escape double quotes', () => {
            expect(escapeForShell('echo "hello"')).toBe('echo \\"hello\\"');
        });

        test('should escape dollar signs', () => {
            expect(escapeForShell('echo $USER')).toBe('echo \\$USER');
        });

        test('should escape backslashes', () => {
            expect(escapeForShell('path\\to\\file')).toBe('path\\\\to\\\\file');
        });

        test('should escape multiple special characters', () => {
            const input = 'echo "Hello $USER" `date`';
            const expected = 'echo \\"Hello \\$USER\\" \\`date\\`';
            expect(escapeForShell(input)).toBe(expected);
        });

        test('should handle empty string', () => {
            expect(escapeForShell('')).toBe('');
        });

        test('should not modify safe strings', () => {
            const safeString = 'hello world 123';
            expect(escapeForShell(safeString)).toBe(safeString);
        });

        test('should handle strings with only special characters', () => {
            expect(escapeForShell('$"`\\')).toBe('\\$\\"\\`\\\\');
        });
    });

    describe('isPathExcluded', () => {
        test('should return true for excluded paths', () => {
            expect(isPathExcluded('src/node_modules/lib.js')).toBe(true);
            expect(isPathExcluded('project/.git/config')).toBe(true);
            expect(isPathExcluded('build/app.js')).toBe(true);
            expect(isPathExcluded('.DS_Store')).toBe(true);
        });

        test('should return false for non-excluded paths', () => {
            expect(isPathExcluded('src/index.ts')).toBe(false);
            expect(isPathExcluded('lib/utils.js')).toBe(false);
            expect(isPathExcluded('components/App.tsx')).toBe(false);
        });

        test('should handle custom exclusion patterns', () => {
            const customPatterns = ['test', 'docs'];
            expect(isPathExcluded('src/test/file.ts', customPatterns)).toBe(true);
            expect(isPathExcluded('project/docs/readme.md', customPatterns)).toBe(true);
            expect(isPathExcluded('src/index.ts', customPatterns)).toBe(false);
        });

        test('should handle nested paths', () => {
            expect(isPathExcluded('project/deep/node_modules/lib/index.js')).toBe(true);
            expect(isPathExcluded('project/src/components/App.tsx')).toBe(false);
        });

        test('should handle root-level excluded items', () => {
            expect(isPathExcluded('node_modules')).toBe(true);
            expect(isPathExcluded('.git')).toBe(true);
            expect(isPathExcluded('dist')).toBe(true);
        });

        test('should handle empty paths', () => {
            expect(isPathExcluded('')).toBe(false);
        });

        test('should handle paths with similar but different names', () => {
            expect(isPathExcluded('node_modules_backup/lib.js')).toBe(false);
            expect(isPathExcluded('src/build_tools/webpack.js')).toBe(false);
        });
    });
});