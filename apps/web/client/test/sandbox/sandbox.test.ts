import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// Helper function to create mock functions with proper interface
function createMock<T extends (...args: any[]) => any>(fn: T): T & { mockClear: () => void; mock: { calls: any[][] } } {
    const mockFn = mock(fn) as any;
    return mockFn;
}

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
    let mockEditorEngine: any;

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
            dispose: mock(() => { }),
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
            disconnect: mock(async () => {}),
        };

        // Mock EditorEngine
        mockEditorEngine = {
            // Add any properties that EditorEngine might have
        };

        sandboxManager = new SandboxManager(mockEditorEngine);
        // Create mock functions with proper interface
        const mockReadFile = mock(async (path: string) => {
            if (path === 'file1.tsx') {
                return '<div>Test Component</div>';
            }
            return null;
        });

        const mockWriteFile = mock(async () => true);

        const mockListFilesRecursively = mock(async () => []);

        // Set up the adapter with a mock session for testing
        // @ts-ignore - accessing private property for testing
        sandboxManager.adapter = {
            providerType: 'codesandbox',
            isConnecting: false,
            session: mockSession,
            start: mock(async () => mockSession),
            hibernate: mock(async () => {}),
            disconnect: mock(async () => {}),
            readFile: mockReadFile,
            writeFile: mockWriteFile,
            readBinaryFile: mock(async () => null),
            writeBinaryFile: mock(async () => true),
            listFiles: mock(async () => []),
            listFilesRecursively: mockListFilesRecursively,
            watchFiles: mock(async () => {}),
            stopWatching: mock(() => {}),
            runCommand: mock(async () => ({ output: '', success: true, error: null })),
            downloadFiles: mock(async () => null),
            clear: mock(() => {})
        };
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
            disconnect: mock(async () => {}),
        };

        const testManager = new SandboxManager(mockEditorEngine);
        // Set up the adapter with a mock session for testing
        // @ts-ignore - accessing private property for testing
        testManager.adapter = {
            providerType: 'codesandbox',
            isConnecting: false,
            session: testMockSession,
            start: mock(async () => testMockSession),
            hibernate: mock(async () => {}),
            disconnect: mock(async () => {}),
            readFile: mock(async () => null),
            writeFile: mock(async () => true),
            readBinaryFile: mock(async () => null),
            writeBinaryFile: mock(async () => true),
            listFiles: mock(async () => []),
            listFilesRecursively: mock(async (dir: string) => {
                if (dir === './') {
                    return ['file1.tsx', 'file2.tsx', 'src/component.tsx'];
                }
                return [];
            }),
            watchFiles: mock(async () => {}),
            stopWatching: mock(() => {}),
            runCommand: mock(async () => ({ output: '', success: true, error: null })),
            downloadFiles: mock(async () => null),
            clear: mock(() => {})
        };

        const files = await testManager.listFilesRecursively(
            './',
            IGNORED_DIRECTORIES,
            JSX_FILE_EXTENSIONS,
        );

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
        const result = await sandboxManager.writeFile(
            'file1.tsx',
            '<div id="123">Modified Component</div>',
        );
        expect(result).toBe(true);
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
            disconnect: mock(async () => {}),
        };

        const errorManager = new SandboxManager(mockEditorEngine);
        // Set up the adapter with a broken session for testing
        // @ts-ignore - accessing private property for testing
        errorManager.adapter = {
            providerType: 'codesandbox',
            isConnecting: false,
            session: errorSession,
            start: mock(async () => errorSession),
            hibernate: mock(async () => {}),
            disconnect: mock(async () => {}),
            readFile: mock(async () => null),
            writeFile: mock(async () => false),
            readBinaryFile: mock(async () => null),
            writeBinaryFile: mock(async () => false),
            listFiles: mock(async () => []),
            listFilesRecursively: mock(async () => []),
            watchFiles: mock(async () => {}),
            stopWatching: mock(() => {}),
            runCommand: mock(async () => ({ output: '', success: false, error: 'Error' })),
            downloadFiles: mock(async () => null),
            clear: mock(() => {})
        };

        // We need to create a custom fileSync mock that returns null for this test
        const errorFileSync = {
            readOrFetch: mock(async () => null),
            write: mock(async () => false),
            clear: mock(async () => undefined),
            updateCache: mock(async () => undefined),
        };

        // @ts-ignore - accessing private property for testing
        errorManager.fileSync = errorFileSync;

        // Clear mocks before test
        errorFileSync.readOrFetch.mockClear();
        errorFileSync.write.mockClear();

        // Clear mocks before test
        // @ts-ignore - accessing private property for testing
        errorManager.adapter!.readFile.mockClear();
        // @ts-ignore - accessing private property for testing
        errorManager.adapter!.writeFile.mockClear();

        // Test readFile with broken session
        const readResult = await errorManager.readFile('error.tsx');
        expect(readResult).toBe(null);

        // Test writeFile with broken session
        const writeResult = await errorManager.writeFile('error.tsx', '<div>Content</div>');
        expect(writeResult).toBe(false);
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
        // All these should resolve to the same file
        const variants = [
            'file1.tsx',
            './file1.tsx',
            // '/file1.tsx',
            '/project/sandbox/file1.tsx', // if root is '/project/sandbox'
        ];

        const normalizedPath = 'file1.tsx';

        for (const variant of variants) {
            // Clear mock before each iteration
            // @ts-ignore - accessing private property for testing
            sandboxManager.adapter!.readFile.mockClear();
            
            await sandboxManager.readFile(variant);
            // @ts-ignore - accessing private property for testing
            expect(sandboxManager.adapter!.readFile).toHaveBeenCalledWith(normalizedPath);
        }
    });

    test('should normalize file paths for write', async () => {
        // All these should resolve to the same file
        const variants = [
            'file1.tsx',
            './file1.tsx',
            // '/file1.tsx',
            '/project/sandbox/file1.tsx', // if root is '/project/sandbox'
        ];

        const normalizedPath = 'file1.tsx';

        for (const variant of variants) {
            // Clear mock before each iteration
            // @ts-ignore - accessing private property for testing
            sandboxManager.adapter!.writeFile.mockClear();
            
            await sandboxManager.writeFile(variant, 'test');
            // @ts-ignore - accessing private property for testing
            expect(sandboxManager.adapter!.writeFile).toHaveBeenCalledWith(normalizedPath, 'test');
        }
    });
});
