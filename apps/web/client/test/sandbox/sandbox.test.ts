import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// Setup mocks before imports
// Mock localforage before importing anything that uses it
const mockGetItem = mock<(key: string) => Promise<any>>(async () => null);
const mockSetItem = mock<(key: string, value: any) => Promise<any>>(async () => undefined);
const mockRemoveItem = mock<(key: string) => Promise<any>>(async () => undefined);

// Mock FileSyncManager before importing SandboxManager or any code that uses it
const mockReadOrFetch = mock(async (path: string) => '<div>Mocked Content</div>');
const mockWrite = mock(async (path: string, content: string) => true);
const mockClear = mock(async () => undefined);

import { SandboxManager } from '../../src/components/store/editor/sandbox';

describe('SandboxManager', () => {
    let sandboxManager: SandboxManager;
    let mockSession: any;
    let mockWatcher: any;
    let mockFileSync: any;

    beforeEach(() => {
        mockGetItem.mockClear();
        mockSetItem.mockClear();
        mockRemoveItem.mockClear();

        mock.module('localforage', () => ({
            getItem: mockGetItem,
            setItem: mockSetItem,
            removeItem: mockRemoveItem,
        }));

        mock.module('../src/components/store/editor/sandbox/file-sync', () => ({
            FileSyncManager: class {
                readOrFetch = mockReadOrFetch;
                write = mockWrite;
                clear = mockClear;
            },
        }));

        mock.module('@onlook/parser', () => ({
            getAstFromContent: (content: string) => content,
            getContentFromAst: (ast: any) => ast,
            addOidsToAst: (ast: any) => ({
                ast: ast, // Return the ast unchanged but in correct structure
                modified: false,
            }),
            createTemplateNodeMap: () => new Map(),
        }));

        const mockEntries = [
            { name: 'file1.tsx', type: 'file' },
            { name: 'file2.tsx', type: 'file' },
            { name: 'node_modules', type: 'directory' },
            { name: 'src', type: 'directory' },
        ];

        const mockSrcEntries = [
            { name: 'component.tsx', type: 'file' },
            { name: 'utils.ts', type: 'file' },
        ];

        // Create a sandbox with a mock FileSyncManager
        mockFileSync = {
            readOrFetch: mock(async () => '<div>Mocked Content</div>'),
            write: mock(async () => true),
            clear: mock(async () => undefined),
            updateCache: mock(async () => undefined),
        };

        mockWatcher = {
            onEvent: mock((callback: any) => {
                mockWatcher.callback = callback;
            }),
            dispose: mock(() => {}),
            callback: null,
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
                watch: mock(async () => mockWatcher),
            },
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
                            { name: 'src', type: 'directory' },
                        ];
                    } else if (dir === 'src') {
                        return [{ name: 'component.tsx', type: 'file' }];
                    }
                    return [];
                }),
                readTextFile: mock(async () => ''),
                writeTextFile: mock(async () => true),
                watch: mock(async () => mockWatcher),
            },
        };

        const testManager = new SandboxManager();
        testManager.init(testMockSession);

        const files = await testManager.listFilesRecursively(
            './',
            IGNORED_DIRECTORIES,
            JSX_FILE_EXTENSIONS,
        );

        expect(testMockSession.fs.readdir.mock.calls.length).toBeGreaterThan(0);
        expect(testMockSession.fs.readdir.mock.calls.some((call) => call[0] === './')).toBe(true);
        expect(testMockSession.fs.readdir.mock.calls.some((call) => call[0] === 'src')).toBe(true);

        expect(files).toEqual(['file1.tsx', 'file2.tsx', 'src/component.tsx']);
    });

    test('should read file content', async () => {
        // Override the fileSync property to use our specific mock
        // @ts-ignore - accessing private property for testing
        sandboxManager.fileSync = mockFileSync;

        const content = await sandboxManager.readFile('file1.tsx');
        expect(content).toBe('<div>Mocked Content</div>');
        expect(mockFileSync.readOrFetch).toHaveBeenCalledWith('file1.tsx', expect.any(Function));
    });

    test('should write file content', async () => {
        // Override the fileSync property to use our specific mock
        // @ts-ignore - accessing private property for testing
        sandboxManager.fileSync = mockFileSync;

        const result = await sandboxManager.writeFile(
            'file1.tsx',
            '<div id="123">Modified Component</div>',
        );
        expect(result).toBe(true);
        expect(mockFileSync.write).toHaveBeenCalledWith(
            'file1.tsx',
            '<div id="123">Modified Component</div>',
            expect.any(Function),
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
                watch: mock(async () => mockWatcher),
            },
        };

        const errorManager = new SandboxManager();
        errorManager.init(errorSession);

        // We need to create a custom fileSync mock that returns null for this test
        const errorFileSync = {
            readOrFetch: mock(async () => null),
            write: mock(async () => false),
            clear: mock(async () => undefined),
            updateCache: mock(async () => undefined),
        };

        // @ts-ignore - accessing private property for testing
        errorManager.fileSync = errorFileSync;

        // Test readFile with broken session
        const readResult = await errorManager.readFile('error.tsx');
        expect(readResult).toBe(null);
        expect(errorFileSync.readOrFetch).toHaveBeenCalledWith('error.tsx', expect.any(Function));

        // Test writeFile with broken session
        const writeResult = await errorManager.writeFile('error.tsx', '<div>Content</div>');
        expect(writeResult).toBe(false);
        expect(errorFileSync.write).toHaveBeenCalledWith(
            'error.tsx',
            '<div>Content</div>',
            expect.any(Function),
        );
    });

    test('FileSyncManager should use remote file operations through callbacks', async () => {
        // We need to mock the module directly with concrete implementations
        mock.module('../src/components/store/editor/sandbox/file-sync', () => ({
            FileSyncManager: class {
                constructor(options: any) {
                    // Constructor logic
                }

                async readOrFetch(path: string, readCallback: any) {
                    if (path === 'cached.tsx') {
                        return '<div>Cached</div>';
                    }
                    return await readCallback(path);
                }

                async write(path: string, content: string, writeCallback: any) {
                    await writeCallback(path, content);
                    return true;
                }

                async clear() {
                    return undefined;
                }
            },
        }));

        const { FileSyncManager } = require('../src/components/store/editor/sandbox/file-sync');

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
            removeItem: testRemoveItem,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const cachedContent = await fileSync.readOrFetch('cached.tsx', mockReadFile);
        expect(cachedContent).toBe('<div>Cached</div>');
        expect(mockReadFile).not.toHaveBeenCalled();

        const uncachedContent = await fileSync.readOrFetch('uncached.tsx', mockReadFile);
        expect(uncachedContent).toBe('<div>From Filesystem</div>');
        expect(mockReadFile).toHaveBeenCalledWith('uncached.tsx');

        testSetItem.mockClear();
        await fileSync.write('test.tsx', '<div>Test Content</div>', mockWriteFile);
        expect(mockWriteFile).toHaveBeenCalledWith('test.tsx', '<div>Test Content</div>');

        testRemoveItem.mockClear();
        await fileSync.clear();
    });

    test('should normalize file paths for read', async () => {
        // Override the fileSync property in the sandboxManager
        // @ts-ignore - accessing private property for testing
        sandboxManager.fileSync = mockFileSync;

        // All these should resolve to the same file
        const variants = [
            'file1.tsx',
            './file1.tsx',
            // '/file1.tsx',
            '/project/sandbox/file1.tsx', // if root is '/project/sandbox'
        ];

        const normalizedPath = 'file1.tsx';

        for (const variant of variants) {
            await sandboxManager.readFile(variant);
            expect(mockFileSync.readOrFetch).toHaveBeenCalledWith(
                normalizedPath,
                expect.any(Function),
            );
        }
    });

    test('should normalize file paths for write', async () => {
        // Override the fileSync property in the sandboxManager
        // @ts-ignore - accessing private property for testing
        sandboxManager.fileSync = mockFileSync;

        // All these should resolve to the same file
        const variants = [
            'file1.tsx',
            './file1.tsx',
            // '/file1.tsx',
            '/project/sandbox/file1.tsx', // if root is '/project/sandbox'
        ];

        const normalizedPath = 'file1.tsx';

        for (const variant of variants) {
            await sandboxManager.writeFile(variant, 'test');
            expect(mockFileSync.write).toHaveBeenCalledWith(
                normalizedPath,
                'test',
                expect.any(Function),
            );
        }
    });
});
