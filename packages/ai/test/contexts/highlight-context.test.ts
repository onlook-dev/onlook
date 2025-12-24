import { MessageContextType, type HighlightMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { HighlightContext } from '../../src/contexts/classes/highlight';

describe('HighlightContext', () => {
    const createMockHighlightContext = (overrides: Partial<HighlightMessageContext> = {}): HighlightMessageContext => ({
        type: MessageContextType.HIGHLIGHT,
        path: 'src/components/Button.tsx',
        start: 5,
        end: 10,
        content: 'const handleClick = () => {\n  console.log("clicked");\n};',
        displayName: 'Button.tsx',
        branchId: 'feature-branch-456',
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(HighlightContext.contextType).toBe(MessageContextType.HIGHLIGHT);
        });

        test('should have correct display name', () => {
            expect(HighlightContext.displayName).toBe('Code Selection');
        });

        test('should have an icon', () => {
            expect(HighlightContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format', () => {
            const context = createMockHighlightContext();
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('<path>src/components/Button.tsx#L5:L10</path>');
            expect(prompt).toContain('<branch>id: "feature-branch-456"</branch>');
            expect(prompt).toContain('```');
            expect(prompt).toContain('const handleClick = () => {');
            expect(prompt).toContain('console.log("clicked");');
        });

        test('should handle single line highlight', () => {
            const context = createMockHighlightContext({
                start: 3,
                end: 3,
                content: 'export const Button = () => <button>Click</button>;',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('#L3:L3');
            expect(prompt).toContain('export const Button = () => <button>Click</button>;');
        });

        test('should handle large line numbers', () => {
            const context = createMockHighlightContext({
                start: 1000,
                end: 1005,
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('#L1000:L1005');
        });

        test('should handle empty content', () => {
            const context = createMockHighlightContext({
                content: '',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('<path>src/components/Button.tsx#L5:L10</path>');
            expect(prompt).toContain('<branch>id: "feature-branch-456"</branch>');
            expect(prompt).toContain('```');
        });

        test('should handle content with special characters', () => {
            const context = createMockHighlightContext({
                content: 'const regex = /[a-z]+/g;\nconst html = "<div>Hello & goodbye</div>";',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('/[a-z]+/g');
            expect(prompt).toContain('<div>Hello & goodbye</div>');
        });

        test('should handle path with special characters', () => {
            const context = createMockHighlightContext({
                path: 'src/components/Button & Icon.tsx',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('<path>src/components/Button & Icon.tsx#L5:L10</path>');
        });

        test('should handle branch ID with special characters', () => {
            const context = createMockHighlightContext({
                branchId: 'feature/user-auth-&-validation',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: "feature/user-auth-&-validation"</branch>');
        });

        test('should handle zero line numbers', () => {
            const context = createMockHighlightContext({
                start: 0,
                end: 0,
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('#L0:L0');
        });
    });

    describe('getLabel', () => {
        test('should use displayName when available', () => {
            const context = createMockHighlightContext({
                displayName: 'Custom Button Component',
            });
            const label = HighlightContext.getLabel(context);

            expect(label).toBe('Custom Button Component');
        });

        test('should extract filename from path when no displayName', () => {
            const context = createMockHighlightContext({
                displayName: '',
                path: 'src/utils/helpers.ts',
            });
            const label = HighlightContext.getLabel(context);

            expect(label).toBe('helpers.ts');
        });

        test('should fallback to "Code Selection" for empty path', () => {
            const context = createMockHighlightContext({
                displayName: '',
                path: '',
            });
            const label = HighlightContext.getLabel(context);

            expect(label).toBe('Code Selection');
        });

        test('should fallback to "Code Selection" for path ending with slash', () => {
            const context = createMockHighlightContext({
                displayName: '',
                path: 'src/components/',
            });
            const label = HighlightContext.getLabel(context);

            expect(label).toBe('Code Selection');
        });

        test('should handle undefined displayName', () => {
            const context = createMockHighlightContext();
            delete (context as any).displayName;
            const label = HighlightContext.getLabel(context);

            expect(label).toBe('Button.tsx');
        });
    });

    describe('getHighlightsContent', () => {
        test('should generate content for single highlight', () => {
            const highlights = [createMockHighlightContext()];
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', highlights, 'feature-branch-456');

            expect(content).toContain('I am looking at this specific part of the file');
            expect(content).toContain('<highlight>');
            expect(content).toContain('<path>src/components/Button.tsx#L5:L10</path>');
            expect(content).toContain('const handleClick = () => {');
        });

        test('should generate content for multiple highlights', () => {
            const highlights = [
                createMockHighlightContext({
                    start: 1,
                    end: 3,
                    content: 'import React from "react";',
                }),
                createMockHighlightContext({
                    start: 10,
                    end: 15,
                    content: 'export default Button;',
                }),
            ];
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', highlights, 'feature-branch-456');

            expect(content).toContain('<highlight-1>');
            expect(content).toContain('<highlight-2>');
            expect(content).toContain('import React from "react"');
            expect(content).toContain('export default Button');
        });

        test('should filter highlights by file path', () => {
            const highlights = [
                createMockHighlightContext({
                    path: 'src/components/Button.tsx',
                    content: 'button content',
                }),
                createMockHighlightContext({
                    path: 'src/utils/helpers.ts',
                    content: 'helper content',
                }),
            ];
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', highlights, 'feature-branch-456');

            expect(content).toContain('button content');
            expect(content).not.toContain('helper content');
        });

        test('should return empty string for no matching highlights', () => {
            const highlights = [
                createMockHighlightContext({
                    path: 'src/other/file.ts',
                }),
            ];
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', highlights, 'feature-branch-456');

            expect(content).toBe('');
        });

        test('should return empty string for empty highlights array', () => {
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', [], 'feature-branch-456');
            expect(content).toBe('');
        });

        test('should handle highlights with same path but different cases', () => {
            const highlights = [
                createMockHighlightContext({
                    path: 'src/Components/Button.tsx',
                }),
            ];
            const content = HighlightContext.getHighlightsContent('src/components/Button.tsx', highlights, 'feature-branch-456');

            expect(content).toBe('');
        });

        test('should handle very long file paths', () => {
            const longPath = 'src/very/deep/nested/folder/structure/Component.tsx';
            const highlights = [
                createMockHighlightContext({
                    path: longPath,
                }),
            ];
            const content = HighlightContext.getHighlightsContent(longPath, highlights, 'feature-branch-456');

            expect(content).toContain('I am looking at this specific part');
            expect(content).toContain(longPath);
        });
    });

    describe('edge cases', () => {
        test('should handle negative line numbers', () => {
            const context = createMockHighlightContext({
                start: -1,
                end: -5,
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('#L-1:L-5');
        });

        test('should handle start > end line numbers', () => {
            const context = createMockHighlightContext({
                start: 10,
                end: 5,
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('#L10:L5');
        });

        test('should handle unicode characters in content', () => {
            const context = createMockHighlightContext({
                content: 'const greeting = "Hello 世界! 🌍";',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('Hello 世界! 🌍');
        });

        test('should handle very long content', () => {
            const longContent = 'a'.repeat(10000);
            const context = createMockHighlightContext({
                content: longContent,
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain(longContent);
        });

        test('should handle empty branch ID', () => {
            const context = createMockHighlightContext({
                branchId: '',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: ""</branch>');
        });

        test('should handle whitespace-only content', () => {
            const context = createMockHighlightContext({
                content: '   \n\t  \n   ',
            });
            const prompt = HighlightContext.getPrompt(context);

            expect(prompt).toContain('   \n\t  \n   ');
        });
    });
});