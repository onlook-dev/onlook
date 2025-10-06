import type { ReaddirEntry } from '@codesandbox/sdk';
import { RouterType } from '@onlook/models';
import { describe, expect, test, mock } from 'bun:test';
import { scanAppDirectory } from '../../src/components/store/editor/pages/helper';

// Mock SandboxManager interface
interface MockSandboxManager {
    readDir: (dir: string) => Promise<ReaddirEntry[]>;
    readFile: (path: string) => Promise<string | Uint8Array>;
    routerConfig: { type: RouterType; basePath: string } | null;
}

describe('scanAppDirectory', () => {
    test('should scan simple page structure', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock((dir: string) => {
                if (dir === 'app') {
                    return Promise.resolve([
                        { name: 'page.tsx', type: 'file', isSymlink: false }
                    ]);
                }
                return Promise.resolve([]);
            }),
            readFile: mock((path: string) => {
                console.log('readFile called with:', path);
                return Promise.resolve('export default function Page() { return <div>Test</div>; }');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Home'); // Root page is named "Home"
        expect(result[0].path).toBe('/'); // Root page has path "/"
    });

    test('should handle directory with only page file', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => Promise.resolve([
                { name: 'page.tsx', type: 'file', isSymlink: false }
            ])),
            readFile: mock((path: string) => {
                return Promise.resolve('export default function Page() { return <div>Test</div>; }');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Home');
        expect(result[0].path).toBe('/');
    });

    test('should handle directories without page files', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => Promise.resolve([
                { name: 'components', type: 'directory', isSymlink: false },
                { name: 'utils', type: 'directory', isSymlink: false }
            ])),
            readFile: mock((path: string) => {
                return Promise.resolve('export default function Page() { return <div>Test</div>; }');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        // Should return empty array when no page files found
        expect(result).toEqual([]);
    });

    test('should handle empty directories', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => Promise.resolve([])),
            readFile: mock((path: string) => {
                console.log('readFile called with:', path);
                return Promise.resolve('export default function Page() { return <div>Test</div>; }');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        expect(result).toEqual([]);
    });

    test('should handle file read errors gracefully', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => Promise.resolve([
                { name: 'page.tsx', type: 'file', isSymlink: false }
            ])),
            readFile: mock(() => {
                throw new Error('File read error');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        // Should still return page structure even if file reading fails
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Home'); // Root page is named "Home"
        expect(result[0].path).toBe('/'); // Root page path
    });

    test('should handle directory read errors', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => {
                throw new Error('Directory not found');
            }),
            readFile: mock((path: string) => {
                console.log('readFile called with:', path);
                return Promise.resolve('export default function Page() { return <div>Test</div>; }');
            }),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'nonexistent');
        expect(result).toEqual([]);
    });
});