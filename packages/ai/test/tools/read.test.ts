import { describe, expect, test } from 'bun:test';
import {
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    listFilesTool,
    READ_FILE_TOOL_NAME,
    READ_FILE_TOOL_PARAMETERS,
    readFileTool,
} from '../../src/tools/read';
import { ASK_TOOL_SET, BUILD_TOOL_SET } from '../../src/tools/toolset';

describe('Read File Tool', () => {
    test('should have the correct tool name and parameters', () => {
        expect(READ_FILE_TOOL_NAME).toBe('read_file');
        expect(READ_FILE_TOOL_PARAMETERS).toBeDefined();
        expect(readFileTool).toBeDefined();
    });

    test('should be included in both toolsets', () => {
        expect(BUILD_TOOL_SET[READ_FILE_TOOL_NAME]).toBeDefined();
        expect(ASK_TOOL_SET[READ_FILE_TOOL_NAME]).toBeDefined();
        expect(BUILD_TOOL_SET[READ_FILE_TOOL_NAME]).toBe(readFileTool);
        expect(ASK_TOOL_SET[READ_FILE_TOOL_NAME]).toBe(readFileTool);
    });

    test('should have correct parameter schema', () => {
        const params = READ_FILE_TOOL_PARAMETERS;

        // Check required fields
        expect(params.shape.file_path).toBeDefined();
        expect(params.shape.branchId).toBeDefined();

        // Check optional fields
        expect(params.shape.offset).toBeDefined();
        expect(params.shape.limit).toBeDefined();
    });

    test('should validate parameters correctly', () => {
        const validParams = {
            file_path: '/absolute/path/to/file.ts',
            branchId: 'branch123',
        };

        const validParamsWithOptions = {
            file_path: 'relative/path/file.js',
            offset: 10,
            limit: 100,
            branchId: 'branch456',
        };

        const invalidParams = {
            file_path: '', // Empty path should be invalid
            branchId: 'branch123',
        };

        // Should parse valid params without throwing
        expect(() => READ_FILE_TOOL_PARAMETERS.parse(validParams)).not.toThrow();
        expect(() => READ_FILE_TOOL_PARAMETERS.parse(validParamsWithOptions)).not.toThrow();

        // Should throw for invalid params
        expect(() => READ_FILE_TOOL_PARAMETERS.parse(invalidParams)).toThrow();
    });

    test('should handle offset and limit parameters', () => {
        const params = {
            file_path: '/test/file.ts',
            offset: 5,
            limit: 20,
            branchId: 'test-branch',
        };

        const parsed = READ_FILE_TOOL_PARAMETERS.parse(params);
        expect(parsed.offset).toBe(5);
        expect(parsed.limit).toBe(20);
    });
});

describe('List Files Tool', () => {
    test('should have the correct tool name and parameters', () => {
        expect(LIST_FILES_TOOL_NAME).toBe('list_files');
        expect(LIST_FILES_TOOL_PARAMETERS).toBeDefined();
        expect(listFilesTool).toBeDefined();
    });

    test('should be included in both toolsets', () => {
        expect(BUILD_TOOL_SET[LIST_FILES_TOOL_NAME]).toBeDefined();
        expect(ASK_TOOL_SET[LIST_FILES_TOOL_NAME]).toBeDefined();
        expect(BUILD_TOOL_SET[LIST_FILES_TOOL_NAME]).toBe(listFilesTool);
        expect(ASK_TOOL_SET[LIST_FILES_TOOL_NAME]).toBe(listFilesTool);
    });

    test('should have correct parameter schema', () => {
        const params = LIST_FILES_TOOL_PARAMETERS;

        // Check required field
        expect(params.shape.branchId).toBeDefined();

        // Check optional fields
        expect(params.shape.path).toBeDefined();
        expect(params.shape.recursive).toBeDefined();
        expect(params.shape.show_hidden).toBeDefined();
        expect(params.shape.file_types_only).toBeDefined();
        expect(params.shape.ignore).toBeDefined();
    });

    test('should validate parameters correctly', () => {
        const minimalParams = {
            branchId: 'branch123',
        };

        const fullParams = {
            path: '/some/directory',
            recursive: true,
            show_hidden: false,
            file_types_only: true,
            ignore: ['node_modules', '*.log', '.git'],
            branchId: 'branch456',
        };

        const invalidParams = {
            // Missing required branchId
            path: '/test',
        };

        // Should parse valid params without throwing
        expect(() => LIST_FILES_TOOL_PARAMETERS.parse(minimalParams)).not.toThrow();
        expect(() => LIST_FILES_TOOL_PARAMETERS.parse(fullParams)).not.toThrow();

        // Should throw for invalid params
        expect(() => LIST_FILES_TOOL_PARAMETERS.parse(invalidParams)).toThrow();
    });

    test('should have proper defaults for optional parameters', () => {
        const minimalParams = {
            branchId: 'test-branch',
        };

        const parsed = LIST_FILES_TOOL_PARAMETERS.parse(minimalParams);

        expect(parsed.recursive).toBe(false);
        expect(parsed.show_hidden).toBe(false);
        expect(parsed.file_types_only).toBe(false);
        expect(parsed.path).toBeUndefined();
        expect(parsed.ignore).toBeUndefined();
    });
});

// Integration tests for path resolution logic
describe('Path Resolution Logic', () => {
    test('should handle absolute vs relative paths', () => {
        const absolutePath = {
            file_path: '/absolute/path/to/file.ts',
            branchId: 'test',
        };

        const relativePath = {
            file_path: 'relative/path/to/file.ts',
            branchId: 'test',
        };

        expect(() => READ_FILE_TOOL_PARAMETERS.parse(absolutePath)).not.toThrow();
        expect(() => READ_FILE_TOOL_PARAMETERS.parse(relativePath)).not.toThrow();
    });

    test('should handle various path formats for listing', () => {
        const paths = [
            { path: '/', branchId: 'test' },
            { path: '/absolute/path', branchId: 'test' },
            { path: 'relative/path', branchId: 'test' },
            { path: './current/dir', branchId: 'test' },
            { path: '../parent/dir', branchId: 'test' },
        ];

        paths.forEach((pathParams) => {
            expect(() => LIST_FILES_TOOL_PARAMETERS.parse(pathParams)).not.toThrow();
        });
    });
});

// Error handling tests
describe('Error Handling', () => {
    test('should require branchId for all tools', () => {
        const readWithoutBranch = {
            file_path: '/test/file.ts',
        };

        const listWithoutBranch = {
            path: '/test/dir',
        };

        const fuzzyWithoutBranch = {
            partial_path: 'test',
        };

        expect(() => READ_FILE_TOOL_PARAMETERS.parse(readWithoutBranch)).toThrow();
        expect(() => LIST_FILES_TOOL_PARAMETERS.parse(listWithoutBranch)).toThrow();
    });

    test('should validate data types correctly', () => {
        const invalidReadParams = {
            file_path: 123, // Should be string
            branchId: 'test',
        };

        const invalidListParams = {
            recursive: 'true', // Should be boolean
            branchId: 'test',
        };

        const invalidFuzzyParams = {
            max_results: '5', // Should be number
            partial_path: 'test',
            branchId: 'test',
        };

        expect(() => READ_FILE_TOOL_PARAMETERS.parse(invalidReadParams)).toThrow();
        expect(() => LIST_FILES_TOOL_PARAMETERS.parse(invalidListParams)).toThrow();
    });
});
