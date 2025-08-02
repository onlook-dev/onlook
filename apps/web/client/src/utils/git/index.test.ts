import { describe, expect, it } from 'bun:test';
import { sanitizeCommitMessage, escapeShellString, prepareCommitMessage } from './index';

describe('Git utilities', () => {
    describe('sanitizeCommitMessage', () => {
        it('should handle empty messages', () => {
            expect(sanitizeCommitMessage('')).toBe('Empty commit message');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(sanitizeCommitMessage(null as any)).toBe('Empty commit message');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(sanitizeCommitMessage(undefined as any)).toBe('Empty commit message');
        });

        it('should truncate long messages', () => {
            const longMessage = 'A'.repeat(100);
            const result = sanitizeCommitMessage(longMessage);
            expect(result.length).toBeLessThanOrEqual(75); // 72 + '...'
            expect(result.endsWith('...')).toBe(true);
        });

        it('should preserve short messages', () => {
            const shortMessage = 'Fix bug';
            expect(sanitizeCommitMessage(shortMessage)).toBe(shortMessage);
        });

        it('should handle multiline messages', () => {
            const multilineMessage = 'Fix critical bug\n\nThis fixes a critical issue with user authentication';
            const result = sanitizeCommitMessage(multilineMessage);
            expect(result).toContain('Fix critical bug');
            expect(result).toContain('This fixes a critical issue');
        });

        it('should remove control characters', () => {
            const messageWithControlChars = 'Fix bug\x00\x01\x08';
            const result = sanitizeCommitMessage(messageWithControlChars);
            expect(result).toBe('Fix bug');
        });

        it('should truncate at word boundaries', () => {
            const message = 'This is a very long commit message that should be truncated at word boundaries';
            const result = sanitizeCommitMessage(message);
            expect(result.endsWith('...')).toBe(true);
            // Should not end with a partial word
            const withoutEllipsis = result.slice(0, -3);
            expect(withoutEllipsis.endsWith(' ')).toBe(false);
        });
    });

    describe('escapeShellString', () => {
        it('should handle empty strings', () => {
            expect(escapeShellString('')).toBe('""');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(escapeShellString(null as any)).toBe('""');
        });

        it('should not quote safe strings', () => {
            expect(escapeShellString('simple')).toBe('simple');
            expect(escapeShellString('file.txt')).toBe('file.txt');
            expect(escapeShellString('path/to/file')).toBe('path/to/file');
        });

        it('should quote unsafe strings', () => {
            expect(escapeShellString('hello world')).toBe("'hello world'");
            expect(escapeShellString('hello "world"')).toBe("'hello \"world\"'");
        });

        it('should handle single quotes correctly', () => {
            expect(escapeShellString("don't")).toBe("'don'\\''t'");
        });
    });

    describe('prepareCommitMessage', () => {
        it('should sanitize and escape messages', () => {
            const dangerousMessage = 'Fix bug; rm -rf /';
            const result = prepareCommitMessage(dangerousMessage);
            expect(result).toContain("'Fix bug; rm -rf /'");
        });

        it('should handle long messages with special characters', () => {
            const longMessage = 'Fix critical bug with "quotes" and special chars'.repeat(3);
            const result = prepareCommitMessage(longMessage);
            expect(result.startsWith("'")).toBe(true);
            expect(result.endsWith("'")).toBe(true);
        });
    });
});