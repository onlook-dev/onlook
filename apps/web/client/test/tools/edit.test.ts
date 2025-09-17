import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EditorEngine } from '@/components/store/editor/engine';
import {
    handleSearchReplaceEditFileTool,
    handleSearchReplaceMultiEditFileTool,
} from '@/components/tools/handlers/edit';

// Mock the EditorEngine and Sandbox
const mockSandbox = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    fileExists: vi.fn(),
};

const mockBranches = {
    getSandboxById: vi.fn(),
};

const mockEditorEngine = {
    branches: mockBranches,
} as unknown as EditorEngine;

describe('Edit Tool Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBranches.getSandboxById.mockReturnValue(mockSandbox);
        mockSandbox.writeFile.mockResolvedValue(true);
    });

    describe('handleSearchReplaceEditFileTool', () => {
        it('should successfully replace a single occurrence', async () => {
            const fileContent = 'Hello world, this is a test';
            mockSandbox.readFile.mockResolvedValue({
                content: fileContent,
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'Hello',
                new_string: 'Hi',
                replace_all: false,
            };

            const result = await handleSearchReplaceEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hi world, this is a test');
            expect(result).toBe('File /test/file.ts edited successfully');
        });

        it('should throw error when string not found', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'NotFound',
                new_string: 'Replacement',
                replace_all: false,
            };

            await expect(handleSearchReplaceEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'String not found in file: NotFound'
            );
        });

        it('should throw error when multiple occurrences found without replace_all', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'test test test',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'test',
                new_string: 'replacement',
                replace_all: false,
            };

            await expect(handleSearchReplaceEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'Multiple occurrences found. Use replace_all=true or provide more context.'
            );
        });

        it('should replace all occurrences when replace_all is true', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'test test test',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'test',
                new_string: 'replacement',
                replace_all: true,
            };

            const result = await handleSearchReplaceEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'replacement replacement replacement');
            expect(result).toBe('File /test/file.ts edited successfully');
        });

        it('should handle replace_all with non-existent string', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'notfound',
                new_string: 'replacement',
                replace_all: true,
            };

            const result = await handleSearchReplaceEditFileTool(args, mockEditorEngine);

            // replace_all with non-existent string should succeed but make no changes
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hello world');
            expect(result).toBe('File /test/file.ts edited successfully');
        });

        it('should handle empty old_string with replace_all', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'abc',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: '',
                new_string: 'X',
                replace_all: true,
            };

            const result = await handleSearchReplaceEditFileTool(args, mockEditorEngine);

            // Empty string replacement should insert between every character
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'XaXbXcX');
            expect(result).toBe('File /test/file.ts edited successfully');
        });

        it('should fail when old_string equals new_string', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                old_string: 'Hello',
                new_string: 'Hello',
                replace_all: false,
            };

            // This should still work, even though it's a no-op
            const result = await handleSearchReplaceEditFileTool(args, mockEditorEngine);
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hello world');
            expect(result).toBe('File /test/file.ts edited successfully');
        });
    });

    describe('handleSearchReplaceMultiEditFileTool', () => {
        it('should successfully apply multiple edits', async () => {
            const fileContent = 'Hello world, this is a test';
            mockSandbox.readFile.mockResolvedValue({
                content: fileContent,
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'Hello', new_string: 'Hi', replace_all: false },
                    { old_string: 'world', new_string: 'universe', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hi universe, this is a test');
            expect(result).toBe('File /test/file.ts edited with 2 changes');
        });

        it('should validate all edits before applying any', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'Hello', new_string: 'Hi', replace_all: false },
                    { old_string: 'NotFound', new_string: 'Replacement', replace_all: false },
                ],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'String not found in file: NotFound'
            );

            // Ensure writeFile was never called since validation failed
            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });

        it('should handle replace_all edits correctly', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'test test world test',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'test', new_string: 'replacement', replace_all: true },
                    { old_string: 'world', new_string: 'universe', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'replacement replacement universe replacement');
            expect(result).toBe('File /test/file.ts edited with 2 changes');
        });

        it('should throw error when validation finds multiple occurrences', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'test test world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'test', new_string: 'replacement', replace_all: false },
                ],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'Multiple occurrences found for "test". Use replace_all=true or provide more context.'
            );

            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });

        it('should handle mixed replace_all and single replace edits', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello Hello world test',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'Hello', new_string: 'Hi', replace_all: true },
                    { old_string: 'world', new_string: 'universe', replace_all: false },
                    { old_string: 'test', new_string: 'example', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hi Hi universe example');
            expect(result).toBe('File /test/file.ts edited with 3 changes');
        });

        it('should apply edits sequentially in provided order', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'old text here',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'old', new_string: 'new', replace_all: false },
                    { old_string: 'new', new_string: 'final', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            // Sequential application: 'old' -> 'new' -> 'final'
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'final text here');
            expect(result).toBe('File /test/file.ts edited with 2 changes');
        });

        it('should handle multiple non-overlapping edits sequentially', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'start middle end',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'start', new_string: 'beginning', replace_all: false },
                    { old_string: 'middle', new_string: 'center', replace_all: false },
                    { old_string: 'end', new_string: 'finish', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'beginning center finish');
            expect(result).toBe('File /test/file.ts edited with 3 changes');
        });

        it('should apply mixed replace_all and single edits in order provided', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'foo bar foo',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'foo', new_string: 'qux', replace_all: true },
                    { old_string: 'bar', new_string: 'baz', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            // Sequential: 'foo' -> 'qux' (all): 'qux bar qux'
            // Then 'bar' -> 'baz': 'qux baz qux'
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'qux baz qux');
            expect(result).toBe('File /test/file.ts edited with 2 changes');
        });

        it('should handle multiple sequential edits correctly', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'const myVar = value; const otherVar = data;',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'myVar', new_string: 'newName', replace_all: false },
                    { old_string: 'otherVar', new_string: 'anotherName', replace_all: false },
                    { old_string: 'value', new_string: 'newValue', replace_all: false },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            // Sequential application: each edit builds on the previous result
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'const newName = newValue; const anotherName = data;');
            expect(result).toBe('File /test/file.ts edited with 3 changes');
        });

        it('should throw error when sandbox not found', async () => {
            mockBranches.getSandboxById.mockReturnValue(null);

            const args = {
                branchId: 'invalid-branch',
                file_path: '/test/file.ts',
                edits: [{ old_string: 'test', new_string: 'replacement', replace_all: false }],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'Sandbox not found for branch ID: invalid-branch'
            );
        });

        it('should throw error when file cannot be read', async () => {
            mockSandbox.readFile.mockResolvedValue(null);

            const args = {
                branchId: 'test-branch',
                file_path: '/test/nonexistent.ts',
                edits: [{ old_string: 'test', new_string: 'replacement', replace_all: false }],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'Cannot read file /test/nonexistent.ts: file not found or not text'
            );
        });

        it('should throw error when write fails', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });
            mockSandbox.writeFile.mockResolvedValue(false);

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [{ old_string: 'Hello', new_string: 'Hi', replace_all: false }],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'Failed to write file /test/file.ts'
            );
        });

        it('should handle empty edits array', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hello world');
            expect(result).toBe('File /test/file.ts edited with 0 changes');
        });

        it('should handle replace_all with non-existent string', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'Hello world',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'notfound', new_string: 'replacement', replace_all: true },
                ],
            };

            const result = await handleSearchReplaceMultiEditFileTool(args, mockEditorEngine);

            // replace_all with non-existent string should succeed but make no changes
            expect(mockSandbox.writeFile).toHaveBeenCalledWith('/test/file.ts', 'Hello world');
            expect(result).toBe('File /test/file.ts edited with 1 changes');
        });

        it('should validate sequential edits during validation phase', async () => {
            mockSandbox.readFile.mockResolvedValue({
                content: 'step1 content',
                type: 'text',
            });

            const args = {
                branchId: 'test-branch',
                file_path: '/test/file.ts',
                edits: [
                    { old_string: 'step1', new_string: 'step2', replace_all: false },
                    { old_string: 'step2', new_string: 'final', replace_all: false },
                    { old_string: 'missing', new_string: 'wont work', replace_all: false }, // This should fail
                ],
            };

            await expect(handleSearchReplaceMultiEditFileTool(args, mockEditorEngine)).rejects.toThrow(
                'String not found in file: missing'
            );

            // Ensure no file was written due to validation failure
            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });
    });
});