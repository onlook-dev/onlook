import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { SandboxManager } from '../src/components/store/editor/engine/sandbox';

// Setup mocks before imports
// Mock localforage before importing anything that uses it
const mockGetItem = mock<(key: string) => Promise<any>>(async () => null);
const mockSetItem = mock<(key: string, value: any) => Promise<any>>(async () => undefined);
const mockRemoveItem = mock<(key: string) => Promise<any>>(async () => undefined);

// Now import the SandboxManager which imports localforage

describe('SandboxManager', () => {
    let sandboxManager: SandboxManager;
    let mockSession: any;
    let mockWatcher: any;

    beforeEach(() => {
        mockGetItem.mockClear();
        mockSetItem.mockClear();
        mockRemoveItem.mockClear();

        mock.module('localforage', () => ({
            getItem: mockGetItem,
            setItem: mockSetItem,
            removeItem: mockRemoveItem,
            createInstance: () => ({
                getItem: mockGetItem,
                setItem: mockSetItem,
                removeItem: mockRemoveItem
            }),
            config: () => { return; },
            ready: () => Promise.resolve(),
            setDriver: () => Promise.resolve(),
            driver: () => 'memoryDriver',
            INDEXEDDB: 'asyncStorage',
            WEBSQL: 'webSQLStorage',
            LOCALSTORAGE: 'localStorageWrapper',
            clear: () => Promise.resolve(),
            length: () => Promise.resolve(0),
            key: () => Promise.resolve(null),
            keys: () => Promise.resolve([]),
            iterate: () => Promise.resolve(null),
            dropInstance: () => Promise.resolve()
        }));

        mock.module('@onlook/parser', () => ({
            getAstFromContent: (content: string) => content,
            getContentFromAst: (ast: any) => ast,
            addOidsToAst: (ast: any) => ({
                ast: ast, // Return the ast unchanged but in correct structure
                modified: false
            }),
            createTemplateNodeMap: () => new Map()
        }));

        const mockEntries = [
            { name: 'file1.tsx', type: 'file' },
            { name: 'file2.tsx', type: 'file' },
            { name: 'node_modules', type: 'directory' },
            { name: 'src', type: 'directory' }
        ];

        const mockSrcEntries = [
            { name: 'component.tsx', type: 'file' },
            { name: 'utils.ts', type: 'file' }
        ];

        mockWatcher = {
            onEvent: mock((callback: any) => {
                mockWatcher.callback = callback;
            }),
            dispose: mock(() => { }),
            callback: null
        };

        mockSession = {
            fs: {
                readTextFile: mock(async (path: string) => {
                    if (path.endsWith('.tsx')) {
                        return '<div>Test Component</div>';
                    }
                    return '';
                }),
                writeTextFile: mock(async (path: string, content: string) => {
                    return true;
                }),
                readdir: mock(async (dir: string) => {
                    if (dir === './') {
                        return mockEntries;
                    } else if (dir === './src') {
                        return mockSrcEntries;
                    }
                    return [];
                }),
                watch: mock(async () => mockWatcher)
            }
        };

        sandboxManager = new SandboxManager();
        sandboxManager.init(mockSession);
    });

    afterEach(() => {
        sandboxManager.clear();
    });

    test('should list files recursively', async () => {
        const testMockSession: any = {
            fs: {
                readdir: mock(async (dir: string) => {
                    if (dir === './') {
                        return [
                            { name: 'file1.tsx', type: 'file' },
                            { name: 'file2.tsx', type: 'file' },
                            { name: 'node_modules', type: 'directory' },
                            { name: 'src', type: 'directory' }
                        ];
                    } else if (dir === 'src') {
                        return [
                            { name: 'component.tsx', type: 'file' }
                        ];
                    }
                    return [];
                }),
                readTextFile: mock(async () => ''),
                writeTextFile: mock(async () => true),
                watch: mock(async () => mockWatcher)
            }
        };

        const testManager = new SandboxManager();
        testManager.init(testMockSession);

        const files = await testManager.listFilesRecursively('./', IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS);

        expect(testMockSession.fs.readdir.mock.calls.length).toBeGreaterThan(0);
        expect(testMockSession.fs.readdir.mock.calls.some(call => call[0] === './')).toBe(true);
        expect(testMockSession.fs.readdir.mock.calls.some(call => call[0] === 'src')).toBe(true);

        expect(files).toEqual(['file1.tsx', 'file2.tsx', 'src/component.tsx']);
    });

    test('should read file content', async () => {
        const content = await sandboxManager.readFile('file1.tsx');
        expect(content).toBe('<div>Test Component</div>');
        expect(mockSession.fs.readTextFile).toHaveBeenCalledWith('file1.tsx');
    });

    test('should write file content', async () => {
        const result = await sandboxManager.writeFile('file1.tsx', '<div id="123">Modified Component</div>');
        expect(result).toBe(true);
        expect(mockSession.fs.writeTextFile).toHaveBeenCalledWith(
            'file1.tsx',
            '<div id="123">Modified Component</div>'
        );
    });

    test('should read from localforage cache when reading files multiple times', async () => {
        // First read gets from filesystem and caches
        await sandboxManager.readFile('file1.tsx');

        // Clear the mock to reset call count
        mockSession.fs.readTextFile.mockClear();

        // Second read should use cache
        const content2 = await sandboxManager.readFile('file1.tsx');
        expect(content2).toBe('<div>Test Component</div>');

        // Filesystem should not be accessed for the second read
        expect(mockSession.fs.readTextFile).not.toHaveBeenCalled();
    });

    test('readRemoteFile and writeRemoteFile should handle session errors', async () => {
        // Create a SandboxManager with a broken session
        const errorSession: any = {
            fs: {
                readTextFile: mock(async () => {
                    throw new Error('Failed to read file');
                }),
                writeTextFile: mock(async () => {
                    throw new Error('Failed to write file');
                }),
                readdir: mock(async () => []),
                watch: mock(async () => mockWatcher)
            }
        };

        const errorManager = new SandboxManager();
        errorManager.init(errorSession);

        // Test readFile with broken session
        const readResult = await errorManager.readFile('error.tsx');
        expect(readResult).toBe(null);
        expect(errorSession.fs.readTextFile).toHaveBeenCalledWith('error.tsx');

        // Test writeFile with broken session
        const writeResult = await errorManager.writeFile('error.tsx', '<div>Content</div>');
        expect(writeResult).toBe(false);
        expect(errorSession.fs.writeTextFile).toHaveBeenCalledWith('error.tsx', '<div>Content</div>');
    });

    test('FileSyncManager should use remote file operations through callbacks', async () => {
        const { FileSyncManager } = require('../src/components/store/editor/engine/sandbox/file-sync');

        const testGetItem = mock<(key: string) => Promise<any>>(async () => null);
        const testSetItem = mock<(key: string, value: any) => Promise<any>>(async () => undefined);
        const testRemoveItem = mock<(key: string) => Promise<any>>(async () => undefined);

        testGetItem.mockImplementation(async (key) => {
            if (key === 'file-sync-cache') {
                return { 'cached.tsx': '<div>Cached</div>' };
            }
            return null;
        });

        const mockReadFile = mock(async (path: string) => {
            return '<div>From Filesystem</div>';
        });

        const mockWriteFile = mock(async (path: string, content: string) => {
            return true;
        });

        const fileSync = new FileSyncManager({
            getItem: testGetItem,
            setItem: testSetItem,
            removeItem: testRemoveItem
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const cachedContent = await fileSync.readOrFetch('cached.tsx', mockReadFile);
        expect(cachedContent).toBe('<div>Cached</div>');
        expect(mockReadFile).not.toHaveBeenCalled();

        const uncachedContent = await fileSync.readOrFetch('uncached.tsx', mockReadFile);
        expect(uncachedContent).toBe('<div>From Filesystem</div>');
        expect(mockReadFile).toHaveBeenCalledWith('uncached.tsx');

        testSetItem.mockClear();
        await fileSync.write('test.tsx', '<div>Test Content</div>', mockWriteFile);
        expect(testSetItem).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith('test.tsx', '<div>Test Content</div>');

        testRemoveItem.mockClear();
        await fileSync.clear();
        expect(testRemoveItem).toHaveBeenCalled();
    });
});
