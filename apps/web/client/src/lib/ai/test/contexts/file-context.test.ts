import { MessageContextType, type FileMessageContext, type HighlightMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { FileContext } from '../../src/contexts/classes/file';

describe('FileContext', () => {
    const createMockFileContext = (overrides: Partial<FileMessageContext> = {}): FileMessageContext => ({
        type: MessageContextType.FILE,
        path: 'src/components/Button.tsx',
        content: 'export const Button = () => <button>Click me</button>;',
        displayName: 'Button.tsx',
        branchId: 'main-branch-123',
        ...overrides,
    });

    const createMockHighlightContext = (overrides: Partial<HighlightMessageContext> = {}): HighlightMessageContext => ({
        type: MessageContextType.HIGHLIGHT,
        path: 'src/components/Button.tsx',
        start: 1,
        end: 2,
        content: 'export const Button',
        displayName: 'Button.tsx',
        branchId: 'main-branch-123',
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(FileContext.contextType).toBe(MessageContextType.FILE);
        });

        test('should have correct display name', () => {
            expect(FileContext.displayName).toBe('File');
        });

        test('should have an icon', () => {
            expect(FileContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format for TypeScript file', () => {
            const context = createMockFileContext();
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<path>src/components/Button.tsx</path>');
            expect(prompt).toContain('<branch>id: "main-branch-123"</branch>');
            expect(prompt).toContain('```tsx');
            expect(prompt).toContain('export const Button = () => <button>Click me</button>;');
            expect(prompt).toContain('```');
        });

        test('should generate correct prompt format for JavaScript file', () => {
            const context = createMockFileContext({
                path: 'utils/helper.js',
                content: 'function helper() { return true; }',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<path>utils/helper.js</path>');
            expect(prompt).toContain('```js');
            expect(prompt).toContain('function helper() { return true; }');
        });

        test('should generate correct prompt format for file without extension', () => {
            const context = createMockFileContext({
                path: 'README',
                content: '# Project README',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<path>README</path>');
            expect(prompt).toContain('```');
            expect(prompt).toContain('# Project README');
        });

        test('should handle empty content', () => {
            const context = createMockFileContext({
                content: '',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<path>src/components/Button.tsx</path>');
            expect(prompt).toContain('<branch>id: "main-branch-123"</branch>');
            expect(prompt).toContain('```tsx');
            expect(prompt).toContain('```');
        });

        test('should handle content with special characters', () => {
            const context = createMockFileContext({
                content: 'const message = "Hello & welcome to <our> site!";',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('const message = "Hello & welcome to <our> site!";');
        });

        test('should handle very long file paths', () => {
            const context = createMockFileContext({
                path: 'src/very/deep/nested/folder/structure/with/many/levels/Component.tsx',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<path>src/very/deep/nested/folder/structure/with/many/levels/Component.tsx</path>');
        });

        test('should handle branch IDs with special characters', () => {
            const context = createMockFileContext({
                branchId: 'feature/user-auth-&-permissions',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: "feature/user-auth-&-permissions"</branch>');
        });
    });

    describe('getLabel', () => {
        test('should extract filename from path', () => {
            const context = createMockFileContext({
                path: 'src/components/Button.tsx',
            });
            const label = FileContext.getLabel(context);

            expect(label).toBe('Button.tsx');
        });

        test('should handle file in root directory', () => {
            const context = createMockFileContext({
                path: 'package.json',
            });
            const label = FileContext.getLabel(context);

            expect(label).toBe('package.json');
        });

        test('should handle path with no filename', () => {
            const context = createMockFileContext({
                path: 'src/components/',
            });
            const label = FileContext.getLabel(context);

            expect(label).toBe('File');
        });

        test('should handle empty path', () => {
            const context = createMockFileContext({
                path: '',
            });
            const label = FileContext.getLabel(context);

            expect(label).toBe('File');
        });

        test('should handle path with trailing slash', () => {
            const context = createMockFileContext({
                path: 'src/utils/helper.js/',
            });
            const label = FileContext.getLabel(context);

            expect(label).toBe('File');
        });
    });

    describe('getFilesContent', () => {
        test('should generate content for single file', () => {
            const files = [createMockFileContext()];
            const highlights: HighlightMessageContext[] = [];
            const content = FileContext.getFilesContent(files, highlights);

            expect(content).toContain('I have added these files to the chat');
            expect(content).toContain('<file>');
            expect(content).toContain('<path>src/components/Button.tsx</path>');
            expect(content).toContain('```tsx');
        });

        test('should generate content for multiple files', () => {
            const files = [
                createMockFileContext({ path: 'file1.ts', content: 'content1' }),
                createMockFileContext({ path: 'file2.ts', content: 'content2' }),
            ];
            const highlights: HighlightMessageContext[] = [];
            const content = FileContext.getFilesContent(files, highlights);

            expect(content).toContain('<file-1>');
            expect(content).toContain('<file-2>');
            expect(content).toContain('content1');
            expect(content).toContain('content2');
        });

        test('should include highlights for matching files', () => {
            const files = [createMockFileContext({ path: 'test.ts' })];
            const highlights = [createMockHighlightContext({ path: 'test.ts' })];
            const content = FileContext.getFilesContent(files, highlights);

            expect(content).toContain('<highlight>');
            expect(content).toContain('export const Button');
        });

        test('should return empty string for empty files array', () => {
            const content = FileContext.getFilesContent([], []);
            expect(content).toBe('');
        });

        test('should handle files with same names in different directories', () => {
            const files = [
                createMockFileContext({ path: 'src/Button.tsx' }),
                createMockFileContext({ path: 'tests/Button.tsx' }),
            ];
            const content = FileContext.getFilesContent(files, []);

            expect(content).toContain('<file-1>');
            expect(content).toContain('<file-2>');
            expect(content).toContain('src/Button.tsx');
            expect(content).toContain('tests/Button.tsx');
        });
    });

    describe('getTruncatedFilesContent', () => {
        test('should generate truncated content for files', () => {
            const files = [createMockFileContext()];
            const content = FileContext.getTruncatedFilesContent(files);

            expect(content).toContain('This context originally included the content of files');
            expect(content).toContain('<path>src/components/Button.tsx</path>');
            expect(content).toContain('<branch>id: "main-branch-123"</branch>');
            expect(content).not.toContain('```');
            expect(content).not.toContain('export const Button');
        });

        test('should handle multiple files', () => {
            const files = [
                createMockFileContext({ path: 'file1.ts' }),
                createMockFileContext({ path: 'file2.ts' }),
            ];
            const content = FileContext.getTruncatedFilesContent(files);

            expect(content).toContain('<file-1>');
            expect(content).toContain('<file-2>');
        });

        test('should return empty string for empty files array', () => {
            const content = FileContext.getTruncatedFilesContent([]);
            expect(content).toBe('');
        });
    });

    describe('edge cases', () => {
        test('should handle null or undefined properties gracefully', () => {
            const context = {
                type: MessageContextType.FILE,
                path: 'test.ts',
                content: 'test',
                displayName: 'test.ts',
                branchId: '',
            } as FileMessageContext;

            const prompt = FileContext.getPrompt(context);
            expect(prompt).toContain('<branch>id: ""</branch>');
        });

        test('should handle unicode characters in content', () => {
            const context = createMockFileContext({
                content: 'const emoji = "👋 Hello 世界";',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('👋 Hello 世界');
        });

        test('should handle multiline content', () => {
            const context = createMockFileContext({
                content: 'function test() {\n  return true;\n}',
            });
            const prompt = FileContext.getPrompt(context);

            expect(prompt).toContain('function test() {\n  return true;\n}');
        });
    });
});