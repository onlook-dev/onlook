import { describe, expect, mock, test, beforeEach } from 'bun:test';

// Mock the FontManager class to test router detection
class MockSandbox {
    private files: Record<string, string[]> = {};

    setFiles(directory: string, files: string[]) {
        this.files[directory] = files;
    }

    async listFilesRecursively(directory: string): Promise<string[]> {
        return this.files[directory] || [];
    }
}

// Simplified version of the detectRouterType logic for testing
async function detectRouterType(sandbox: MockSandbox): Promise<{
    type: 'app' | 'pages';
    basePath: string;
} | null> {
    const APP_ROUTER_PATHS = ['src/app', 'app'];
    const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];

    try {
        // Check for app router (app/layout.tsx or src/app/layout.tsx)
        for (const appPath of APP_ROUTER_PATHS) {
            try {
                const appFiles = await sandbox
                    .listFilesRecursively(appPath)
                    .then((files) => files.filter((file) => file.includes('layout.tsx')));

                if (appFiles.length > 0) {
                    return { type: 'app', basePath: appPath };
                }
            } catch (error) {
                // Directory doesn't exist, continue checking
            }
        }

        // Check for pages router (pages/_app.tsx or src/pages/_app.tsx)
        for (const pagesPath of PAGES_ROUTER_PATHS) {
            try {
                const pagesFiles = await sandbox
                    .listFilesRecursively(pagesPath)
                    .then((files) => files.filter((file) => file.includes('_app.tsx')));
                if (pagesFiles.length > 0) {
                    return { type: 'pages', basePath: pagesPath };
                }
            } catch (error) {
                // Directory doesn't exist, continue checking
            }
        }

        // Default to app router if we can't determine
        return { type: 'app', basePath: 'app' };
    } catch (error) {
        console.error('Error detecting router type:', error);
        return null;
    }
}

describe('Router Detection', () => {
    let mockSandbox: MockSandbox;

    beforeEach(() => {
        mockSandbox = new MockSandbox();
    });

    test('detects app router with app/ directory', async () => {
        mockSandbox.setFiles('app', ['layout.tsx', 'page.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'app',
            basePath: 'app'
        });
    });

    test('detects app router with src/app/ directory', async () => {
        mockSandbox.setFiles('src/app', ['layout.tsx', 'page.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'app',
            basePath: 'src/app'
        });
    });

    test('prioritizes src/app over app when both exist', async () => {
        mockSandbox.setFiles('src/app', ['layout.tsx']);
        mockSandbox.setFiles('app', ['layout.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'app',
            basePath: 'src/app'
        });
    });

    test('detects pages router with pages/ directory', async () => {
        mockSandbox.setFiles('pages', ['_app.tsx', 'index.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'pages',
            basePath: 'pages'
        });
    });

    test('detects pages router with src/pages/ directory', async () => {
        mockSandbox.setFiles('src/pages', ['_app.tsx', 'index.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'pages',
            basePath: 'src/pages'
        });
    });

    test('defaults to app router when no router detected', async () => {
        // No files set, should default to app router

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'app',
            basePath: 'app'
        });
    });

    test('prioritizes app router over pages router', async () => {
        mockSandbox.setFiles('app', ['layout.tsx']);
        mockSandbox.setFiles('pages', ['_app.tsx']);

        const result = await detectRouterType(mockSandbox);
        
        expect(result).toEqual({
            type: 'app',
            basePath: 'app'
        });
    });
});
