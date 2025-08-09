import { describe, expect, mock, test } from 'bun:test';
import type { ReaddirEntry } from '@codesandbox/sdk';
import type { PageNode, SandboxFile } from '@onlook/models';
import { RouterType } from '@onlook/models';
import { scanAppDirectory } from '../../src/components/store/editor/pages/helper';

// Mock SandboxManager interface
interface MockSandboxManager {
    readDir: (dir: string) => Promise<ReaddirEntry[]>;
    readFile: (path: string) => Promise<SandboxFile | null>;
    routerConfig: { type: RouterType; basePath: string } | null;
}

// Test data structure
interface TestCase {
    name: string;
    input: {
        directory: string;
        sandboxManager: MockSandboxManager;
    };
    expected: PageNode[];
}

// Mock data for different directory structures
const createMockSandboxManager = (directoryStructure: Record<string, ReaddirEntry[]>): MockSandboxManager => {
    const mockReadDir = mock((dir: string) => {
        const entries = directoryStructure[dir];
        if (!entries) {
            throw new Error(`Directory ${dir} not found`);
        }
        return Promise.resolve(entries);
    });

    const mockReadFile = mock((path: string) => {
        if (path.endsWith('page.tsx')) {
            return Promise.resolve({
                type: 'text' as const,
                path,
                content: `export default function Page() {
    return <div>Test Page</div>;
}`
            });
        }
        if (path.endsWith('layout.tsx')) {
            return Promise.resolve({
                type: 'text' as const,
                path,
                content: `export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}`
            });
        }
        return Promise.resolve(null);
    });

    return {
        readDir: mockReadDir,
        readFile: mockReadFile,
        routerConfig: { type: RouterType.APP, basePath: 'app' }
    };
};

const testCases: TestCase[] = [
    {
        name: 'empty directory',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': []
            })
        },
        expected: []
    },
    {
        name: 'single page without layout',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'page with layout',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'layout.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'nested page structure',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'about', type: 'directory', isSymlink: false }
                ],
                'app/about': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'about',
                        path: '/about',
                        children: [],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'dynamic route',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[id]', type: 'directory', isSymlink: false }
                ],
                'app/[id]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: '[id]',
                        path: '/[id]',
                        children: [],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'ignored directories',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'components', type: 'directory', isSymlink: false },
                    { name: 'lib', type: 'directory', isSymlink: false },
                    { name: 'api', type: 'directory', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'deep nested structure',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'blog', type: 'directory', isSymlink: false }
                ],
                'app/blog': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'posts', type: 'directory', isSymlink: false }
                ],
                'app/blog/posts': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'blog',
                        path: '/blog',
                        children: [
                            {
                                id: expect.any(String),
                                name: 'posts',
                                path: '/blog/posts',
                                children: [],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'slug route with nested structure',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'blog', type: 'directory', isSymlink: false }
                ],
                'app/blog': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[slug]', type: 'directory', isSymlink: false }
                ],
                'app/blog/[slug]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'blog',
                        path: '/blog',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[slug]',
                                path: '/blog/[slug]',
                                children: [],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'multiple slug routes',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'users', type: 'directory', isSymlink: false },
                    { name: 'products', type: 'directory', isSymlink: false }
                ],
                'app/users': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[id]', type: 'directory', isSymlink: false }
                ],
                'app/users/[id]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'profile', type: 'directory', isSymlink: false }
                ],
                'app/users/[id]/profile': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ],
                'app/products': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[category]', type: 'directory', isSymlink: false }
                ],
                'app/products/[category]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[productId]', type: 'directory', isSymlink: false }
                ],
                'app/products/[category]/[productId]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'users',
                        path: '/users',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[id]',
                                path: '/users/[id]',
                                children: [
                                    {
                                        id: expect.any(String),
                                        name: 'profile',
                                        path: '/users/[id]/profile',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    }
                                ],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    },
                    {
                        id: expect.any(String),
                        name: 'products',
                        path: '/products',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[category]',
                                path: '/products/[category]',
                                children: [
                                    {
                                        id: expect.any(String),
                                        name: '[productId]',
                                        path: '/products/[category]/[productId]',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    }
                                ],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'slug route with static nested routes',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'shop', type: 'directory', isSymlink: false }
                ],
                'app/shop': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[productId]', type: 'directory', isSymlink: false },
                    { name: 'categories', type: 'directory', isSymlink: false }
                ],
                'app/shop/[productId]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'reviews', type: 'directory', isSymlink: false }
                ],
                'app/shop/[productId]/reviews': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ],
                'app/shop/categories': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'shop',
                        path: '/shop',
                        children: [
                            {
                                id: expect.any(String),
                                name: 'categories',
                                path: '/shop/categories',
                                children: [],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            },
                            {
                                id: expect.any(String),
                                name: '[productId]',
                                path: '/shop/[productId]',
                                children: [
                                    {
                                        id: expect.any(String),
                                        name: 'reviews',
                                        path: '/shop/[productId]/reviews',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    }
                                ],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'catch-all route with nested structure',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'docs', type: 'directory', isSymlink: false }
                ],
                'app/docs': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[...slug]', type: 'directory', isSymlink: false }
                ],
                'app/docs/[...slug]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'docs',
                        path: '/docs',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[...slug]',
                                path: '/docs/[...slug]',
                                children: [],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'optional catch-all route',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'blog', type: 'directory', isSymlink: false }
                ],
                'app/blog': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: '[[...slug]]', type: 'directory', isSymlink: false }
                ],
                'app/blog/[[...slug]]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'blog',
                        path: '/blog',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[[...slug]]',
                                path: '/blog/[[...slug]]',
                                children: [],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    },
    {
        name: 'mixed static and dynamic routes',
        input: {
            directory: 'app',
            sandboxManager: createMockSandboxManager({
                'app': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'dashboard', type: 'directory', isSymlink: false }
                ],
                'app/dashboard': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'settings', type: 'directory', isSymlink: false },
                    { name: '[userId]', type: 'directory', isSymlink: false }
                ],
                'app/dashboard/settings': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'profile', type: 'directory', isSymlink: false },
                    { name: 'security', type: 'directory', isSymlink: false }
                ],
                'app/dashboard/settings/profile': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ],
                'app/dashboard/settings/security': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ],
                'app/dashboard/[userId]': [
                    { name: 'page.tsx', type: 'file', isSymlink: false },
                    { name: 'analytics', type: 'directory', isSymlink: false }
                ],
                'app/dashboard/[userId]/analytics': [
                    { name: 'page.tsx', type: 'file', isSymlink: false }
                ]
            })
        },
        expected: [
            {
                id: expect.any(String),
                name: 'Home',
                path: '/',
                children: [
                    {
                        id: expect.any(String),
                        name: 'dashboard',
                        path: '/dashboard',
                        children: [
                            {
                                id: expect.any(String),
                                name: '[userId]',
                                path: '/dashboard/[userId]',
                                children: [
                                    {
                                        id: expect.any(String),
                                        name: 'analytics',
                                        path: '/dashboard/[userId]/analytics',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    }
                                ],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            },
                            {
                                id: expect.any(String),
                                name: 'settings',
                                path: '/dashboard/settings',
                                children: [
                                    {
                                        id: expect.any(String),
                                        name: 'profile',
                                        path: '/dashboard/settings/profile',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    },
                                    {
                                        id: expect.any(String),
                                        name: 'security',
                                        path: '/dashboard/settings/security',
                                        children: [],
                                        isActive: false,
                                        isRoot: false,
                                        metadata: {}
                                    }
                                ],
                                isActive: false,
                                isRoot: false,
                                metadata: {}
                            }
                        ],
                        isActive: false,
                        isRoot: false,
                        metadata: {}
                    }
                ],
                isActive: false,
                isRoot: true,
                metadata: {}
            }
        ]
    }
];

describe('scanAppDirectory', () => {
    testCases.forEach(({ name, input, expected }) => {
        test(`should handle ${name}`, async () => {
            const result = await scanAppDirectory(
                input.sandboxManager as any,
                input.directory
            );

            // Helper function to sort nodes by path for consistent comparison
            const sortNodes = (nodes: PageNode[]): PageNode[] => {
                return nodes.sort((a, b) => a.path.localeCompare(b.path)).map(node => ({
                    ...node,
                    children: node.children ? sortNodes(node.children) : []
                }));
            };

            const sortedResult = sortNodes(result);
            const sortedExpected = sortNodes(expected);

            expect(sortedResult).toEqual(sortedExpected);
        });
    });

    test('should handle directory read errors gracefully', async () => {
        const mockSandboxManager = createMockSandboxManager({});
        // Override readDir to throw an error
        mockSandboxManager.readDir = mock(() => {
            throw new Error('Directory not found');
        });

        const result = await scanAppDirectory(mockSandboxManager as any, 'nonexistent');
        expect(result).toEqual([]);
    });

    test('should handle file read errors gracefully', async () => {
        const mockSandboxManager = createMockSandboxManager({
            'app': [
                { name: 'page.tsx', type: 'file', isSymlink: false }
            ]
        });
        // Override readFile to throw an error
        mockSandboxManager.readFile = mock(() => {
            throw new Error('File read error');
        });

        // The function should throw an error when file reading fails
        await expect(scanAppDirectory(mockSandboxManager as any, 'app')).rejects.toThrow('File read error');
    });

    test('should handle metadata extraction errors', async () => {
        const mockSandboxManager = createMockSandboxManager({
            'app': [
                { name: 'page.tsx', type: 'file', isSymlink: false }
            ]
        });
        // Override readFile to return invalid content
        mockSandboxManager.readFile = mock(() => {
            return Promise.resolve({
                type: 'text' as const,
                path: 'app/page.tsx',
                content: 'invalid syntax {'
            });
        });

        const result = await scanAppDirectory(mockSandboxManager as any, 'app');
        expect(result).toHaveLength(1);
        expect(result[0].metadata).toEqual({});
    });
}); 