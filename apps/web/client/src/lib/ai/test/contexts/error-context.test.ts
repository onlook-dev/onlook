import { MessageContextType, type ErrorMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { ErrorContext } from '../../src/contexts/classes/error';

describe('ErrorContext', () => {
    const createMockErrorContext = (overrides: Partial<ErrorMessageContext> = {}): ErrorMessageContext => ({
        type: MessageContextType.ERROR,
        content: 'TypeError: Cannot read property "length" of undefined\n    at Button.tsx:15:20\n    at render',
        displayName: 'Runtime Error',
        branchId: 'main-branch-123',
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(ErrorContext.contextType).toBe(MessageContextType.ERROR);
        });

        test('should have correct display name', () => {
            expect(ErrorContext.displayName).toBe('Error');
        });

        test('should have an icon', () => {
            expect(ErrorContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format', () => {
            const context = createMockErrorContext();
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: "main-branch-123"</branch>');
            expect(prompt).toContain('<error>');
            expect(prompt).toContain('TypeError: Cannot read property "length" of undefined');
            expect(prompt).toContain('at Button.tsx:15:20');
            expect(prompt).toContain('</error>');
        });

        test('should handle single line error', () => {
            const context = createMockErrorContext({
                content: 'SyntaxError: Unexpected token',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('<error>SyntaxError: Unexpected token</error>');
        });

        test('should handle empty error content', () => {
            const context = createMockErrorContext({
                content: '',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: "main-branch-123"</branch>');
            expect(prompt).toContain('<error></error>');
        });

        test('should handle error with special characters', () => {
            const context = createMockErrorContext({
                content: 'Error: Invalid character "&" in component <Button>',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('Invalid character "&" in component <Button>');
        });

        test('should handle multiline stack trace', () => {
            const context = createMockErrorContext({
                content: `Error: Network request failed
    at fetch (http://localhost:3000/api/data:1:1)
    at async getData (/src/utils/api.ts:25:5)
    at async Component (/src/components/DataDisplay.tsx:12:3)`,
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('Network request failed');
            expect(prompt).toContain('at fetch (http://localhost:3000/api/data:1:1)');
            expect(prompt).toContain('at async getData');
        });

        test('should handle empty branch ID', () => {
            const context = createMockErrorContext({
                branchId: '',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: ""</branch>');
        });

        test('should handle branch ID with special characters', () => {
            const context = createMockErrorContext({
                branchId: 'feature/fix-bug-&-improve',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('<branch>id: "feature/fix-bug-&-improve"</branch>');
        });

        test('should handle very long error messages', () => {
            const longError = 'Error: ' + 'Very long error message. '.repeat(100);
            const context = createMockErrorContext({
                content: longError,
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain(longError);
        });
    });

    describe('getLabel', () => {
        test('should use displayName when available', () => {
            const context = createMockErrorContext({
                displayName: 'Build Error',
            });
            const label = ErrorContext.getLabel(context);

            expect(label).toBe('Build Error');
        });

        test('should fallback to "Error" when no displayName', () => {
            const context = createMockErrorContext({
                displayName: '',
            });
            const label = ErrorContext.getLabel(context);

            expect(label).toBe('Error');
        });

        test('should fallback to "Error" when displayName is undefined', () => {
            const context = createMockErrorContext();
            delete (context as any).displayName;
            const label = ErrorContext.getLabel(context);

            expect(label).toBe('Error');
        });

        test('should handle whitespace-only displayName', () => {
            const context = createMockErrorContext({
                displayName: '   \t\n   ',
            });
            const label = ErrorContext.getLabel(context);

            expect(label).toBe('   \t\n   ');
        });

        test('should handle displayName with special characters', () => {
            const context = createMockErrorContext({
                displayName: 'Error: Build & Deploy Failed',
            });
            const label = ErrorContext.getLabel(context);

            expect(label).toBe('Error: Build & Deploy Failed');
        });
    });

    describe('getErrorsContent', () => {
        test('should generate content for single error', () => {
            const errors = [createMockErrorContext()];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('You are helping debug a Next.js React app');
            expect(content).toContain('This project uses Bun as the package manager');
            expect(content).toContain('<errors>');
            expect(content).toContain('<branch>id: "main-branch-123"</branch>');
            expect(content).toContain('TypeError: Cannot read property "length"');
            expect(content).toContain('</errors>');
        });

        test('should generate content for multiple errors', () => {
            const errors = [
                createMockErrorContext({
                    content: 'Error 1: Component not found',
                    branchId: 'branch-1',
                }),
                createMockErrorContext({
                    content: 'Error 2: Missing dependency',
                    branchId: 'branch-2',
                }),
            ];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('Error 1: Component not found');
            expect(content).toContain('Error 2: Missing dependency');
            expect(content).toContain('<branch>id: "branch-1"</branch>');
            expect(content).toContain('<branch>id: "branch-2"</branch>');
        });

        test('should return empty string for empty errors array', () => {
            const content = ErrorContext.getErrorsContent([]);
            expect(content).toBe('');
        });

        test('should include Bun-specific instructions', () => {
            const errors = [createMockErrorContext()];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('Use "bun install" instead of "npm install"');
            expect(content).toContain('Use "bun add" instead of "npm install <package>"');
            expect(content).toContain('Use "bun run" instead of "npm run"');
            expect(content).toContain('Use "bunx" instead of "npx"');
        });

        test('should include Next.js debugging guidance', () => {
            const errors = [createMockErrorContext()];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('Missing dependencies');
            expect(content).toContain('Missing closing tags in JSX/TSX files');
            expect(content).toContain('Analyze all the messages before suggesting solutions');
        });

        test('should warn against suggesting dev command', () => {
            const errors = [createMockErrorContext()];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('NEVER SUGGEST THE "bun run dev" command');
        });

        test('should handle errors with empty content', () => {
            const errors = [
                createMockErrorContext({ content: '' }),
                createMockErrorContext({ content: 'Valid error message' }),
            ];
            const content = ErrorContext.getErrorsContent(errors);

            expect(content).toContain('<error></error>');
            expect(content).toContain('<error>Valid error message</error>');
        });

        test('should preserve error order', () => {
            const errors = [
                createMockErrorContext({ content: 'First error' }),
                createMockErrorContext({ content: 'Second error' }),
                createMockErrorContext({ content: 'Third error' }),
            ];
            const content = ErrorContext.getErrorsContent(errors);

            const firstIndex = content.indexOf('First error');
            const secondIndex = content.indexOf('Second error');
            const thirdIndex = content.indexOf('Third error');

            expect(firstIndex).toBeLessThan(secondIndex);
            expect(secondIndex).toBeLessThan(thirdIndex);
        });
    });

    describe('edge cases', () => {
        test('should handle unicode characters in error content', () => {
            const context = createMockErrorContext({
                content: 'Error: Invalid character "🚫" in filename',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('Invalid character "🚫" in filename');
        });

        test('should handle XML/HTML in error content', () => {
            const context = createMockErrorContext({
                content: 'Error: Unclosed tag <div> found at line 10',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('Unclosed tag <div> found at line 10');
        });

        test('should handle null or undefined properties gracefully', () => {
            const context = {
                type: MessageContextType.ERROR,
                content: 'Basic error',
                displayName: null,
                branchId: undefined,
            } as any;

            expect(() => ErrorContext.getPrompt(context)).not.toThrow();
            expect(() => ErrorContext.getLabel(context)).not.toThrow();
        });

        test('should handle very deep stack traces', () => {
            const deepTrace = Array(50).fill(0).map((_, i) =>
                `    at function${i} (/path/to/file${i}.ts:${i + 1}:5)`
            ).join('\n');
            const context = createMockErrorContext({
                content: `Error: Deep stack\n${deepTrace}`,
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('Error: Deep stack');
            expect(prompt).toContain('at function0');
            expect(prompt).toContain('at function49');
        });

        test('should handle errors with ANSI color codes', () => {
            const context = createMockErrorContext({
                content: '\x1b[31mError: Build failed\x1b[0m\n\x1b[33mWarning: Deprecated\x1b[0m',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('\x1b[31mError: Build failed\x1b[0m');
            expect(prompt).toContain('\x1b[33mWarning: Deprecated\x1b[0m');
        });

        test('should handle errors with file paths containing spaces', () => {
            const context = createMockErrorContext({
                content: 'Error at "/path with spaces/My File.tsx":10:5',
            });
            const prompt = ErrorContext.getPrompt(context);

            expect(prompt).toContain('"/path with spaces/My File.tsx":10:5');
        });
    });
});