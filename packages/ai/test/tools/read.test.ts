import { ReadFileTool } from '@onlook/ai/src/tools/classes/read-file';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { describe, expect, test, mock } from 'bun:test';

describe('ReadFileTool', () => {
    test('should format file content with line numbers', async () => {
        const mockFileSystem = {
            initialize: mock(() => Promise.resolve()),
            readFile: mock(() => Promise.resolve('line 1\nline 2\nline 3'))
        };

        const mockEditorEngine = {
            branches: {
                getBranchDataById: mock(() => ({ codeEditor: mockFileSystem }))
            }
        } as unknown as EditorEngine;

        const tool = new ReadFileTool();
        const result = await tool.handle({
            branchId: 'test-branch',
            file_path: './test.txt'
        }, mockEditorEngine);

        expect(result.content).toBe('1→line 1\n2→line 2\n3→line 3');
        expect(result.lines).toBe(3);
    });

    test('should handle partial reading with offset and limit', async () => {
        const mockFileSystem = {
            initialize: mock(() => Promise.resolve()),
            readFile: mock(() => Promise.resolve('line 1\nline 2\nline 3\nline 4\nline 5'))
        };

        const mockEditorEngine = {
            branches: {
                getBranchDataById: mock(() => ({ codeEditor: mockFileSystem }))
            }
        } as unknown as EditorEngine;

        const tool = new ReadFileTool();
        const result = await tool.handle({
            branchId: 'test-branch',
            file_path: './test.txt',
            offset: 2,
            limit: 2
        }, mockEditorEngine);

        expect(result.content).toBe('2→line 2\n3→line 3');
        expect(result.lines).toBe(2);
    });

    test('should truncate very large files', async () => {
        const largeContent = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}`).join('\n');
        
        const mockFileSystem = {
            initialize: mock(() => Promise.resolve()),
            readFile: mock(() => Promise.resolve(largeContent))
        };

        const mockEditorEngine = {
            branches: {
                getBranchDataById: mock(() => ({ codeEditor: mockFileSystem }))
            }
        } as unknown as EditorEngine;

        const tool = new ReadFileTool();
        const result = await tool.handle({
            branchId: 'test-branch',
            file_path: './large.txt'
        }, mockEditorEngine);

        expect(result.lines).toBe(2000);
        expect(result.content).toContain('... (truncated, showing first 2000 of 3000 lines)');
    });

    test('should reject binary files', async () => {
        const mockFileSystem = {
            initialize: mock(() => Promise.resolve()),
            readFile: mock(() => Promise.resolve(new Uint8Array([1, 2, 3])))
        };

        const mockEditorEngine = {
            branches: {
                getBranchDataById: mock(() => ({ codeEditor: mockFileSystem }))
            }
        } as unknown as EditorEngine;

        const tool = new ReadFileTool();
        
        await expect(tool.handle({
            branchId: 'test-branch',
            file_path: './binary.bin'
        }, mockEditorEngine)).rejects.toThrow('file is not text');
    });

    test('should handle missing file system', async () => {
        const mockEditorEngine = {
            branches: {
                getBranchDataById: mock(() => null)
            }
        } as unknown as EditorEngine;

        const tool = new ReadFileTool();
        
        await expect(tool.handle({
            branchId: 'invalid-branch',
            file_path: './test.txt'
        }, mockEditorEngine)).rejects.toThrow('file system not found');
    });
});