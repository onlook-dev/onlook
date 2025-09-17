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
    });
});