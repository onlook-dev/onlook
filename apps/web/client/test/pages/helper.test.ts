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
            readFile: mock(() => Promise.resolve('export default function Page() { return <div>Test</div>; }')),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Page');
        expect(result[0].path).toBe('/page');
        expect(result[0].type).toBe('page');
    });

    test('should handle nested directory structure', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock((dir: string) => {
                if (dir === 'app') {
                    return Promise.resolve([
                        { name: 'about', type: 'directory', isSymlink: false },
                        { name: 'page.tsx', type: 'file', isSymlink: false }
                    ]);
                }
                if (dir === 'app/about') {
                    return Promise.resolve([
                        { name: 'page.tsx', type: 'file', isSymlink: false }
                    ]);
                }
                return Promise.resolve([]);
            }),
            readFile: mock(() => Promise.resolve('export default function Page() { return <div>Test</div>; }')),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        expect(result).toHaveLength(2);
        
        // Root page
        const rootPage = result.find(r => r.path === '/page');
        expect(rootPage).toBeTruthy();
        expect(rootPage!.name).toBe('Page');

        // About page
        const aboutPage = result.find(r => r.path === '/about/page');
        expect(aboutPage).toBeTruthy();
        expect(aboutPage!.name).toBe('Page');
    });

    test('should handle dynamic routes', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock((dir: string) => {
                if (dir === 'app') {
                    return Promise.resolve([
                        { name: '[id]', type: 'directory', isSymlink: false }
                    ]);
                }
                if (dir === 'app/[id]') {
                    return Promise.resolve([
                        { name: 'page.tsx', type: 'file', isSymlink: false }
                    ]);
                }
                return Promise.resolve([]);
            }),
            readFile: mock(() => Promise.resolve('export default function Page() { return <div>Test</div>; }')),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Page');
        expect(result[0].path).toBe('/[id]/page');
    });

    test('should handle empty directories', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => Promise.resolve([])),
            readFile: mock(() => Promise.resolve('export default function Page() { return <div>Test</div>; }')),
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
        expect(result[0].name).toBe('Page');
        expect(result[0].path).toBe('/page');
    });

    test('should handle directory read errors', async () => {
        const mockSandboxManager: MockSandboxManager = {
            readDir: mock(() => {
                throw new Error('Directory not found');
            }),
            readFile: mock(() => Promise.resolve('export default function Page() { return <div>Test</div>; }')),
            routerConfig: { type: RouterType.APP, basePath: 'app' }
        };

        const result = await scanAppDirectory(mockSandboxManager as any, 'nonexistent');
        expect(result).toEqual([]);
    });
});