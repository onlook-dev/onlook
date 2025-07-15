import { describe, expect, it } from 'vitest';
import { formatGitLogOutput, parseGitLog, parseGitStatusOutput } from '../src/git';

describe('formatGitLogOutput', () => {
    it('should return an empty string if input is empty', () => {
        expect(formatGitLogOutput('')).toBe('');
    });

    it('should remove standard ANSI escape sequences', () => {
        const raw = '\x1b[31mHello\x1b[0m World';
        const formatted = 'Hello World';
        expect(formatGitLogOutput(raw)).toBe(formatted);
    });

    it('should remove complex ANSI escape sequences', () => {
        const raw = '[?1h\x1b=Hello World\x1b[K\x1b[?1l\x1b>';
        const formatted = 'Hello World';
        expect(formatGitLogOutput(raw)).toBe(formatted);
    });

    it('should remove control characters', () => {
        const raw = 'Hello\x07 World\x01';
        const formatted = 'Hello World';
        expect(formatGitLogOutput(raw)).toBe(formatted);
    });

    it('should correctly format a realistic git log output line with escape sequences', () => {
        const raw =
            '\x1b[33m25a8123\x1b[m\x1b[33m\x1b[m|John Doe <john.doe@example.com>|2023-01-01T12:00:00Z|Initial commit';
        const expected =
            '25a8123|John Doe <john.doe@example.com>|2023-01-01T12:00:00Z|Initial commit';
        expect(formatGitLogOutput(raw)).toBe(expected);
    });
});

describe('parseGitStatusOutput', () => {
    it('should return an empty array for empty input', () => {
        expect(parseGitStatusOutput('')).toEqual([]);
    });

    it('should parse standard git status output', () => {
        const output = ' M src/git.ts\n D src/main.ts\n?? new-file.ts';
        const expected = [' M src/git.ts', ' D src/main.ts', '?? new-file.ts'];
        expect(parseGitStatusOutput(output)).toEqual(expected);
    });

    it('should handle prefixed lines', () => {
        const output = 'prefix= M src/git.ts\n  D src/main.ts';
        const expected = [' M src/git.ts', ' D src/main.ts'];
        expect(parseGitStatusOutput(output)).toEqual(expected);
    });
});

describe('parseGitLog', () => {
    it('should return an empty array for empty input', () => {
        expect(parseGitLog('')).toEqual([]);
    });

    it('should parse a single commit log entry', () => {
        const rawOutput =
            'a1b2c3d|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|feat: initial commit';
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(1);
        expect(commits[0]).toEqual({
            oid: 'a1b2c3d',
            message: 'feat: initial commit',
            author: { name: 'John Doe', email: 'john.doe@example.com' },
            timestamp: 1698397200,
            displayName: 'feat: initial commit',
        });
    });

    it('should parse multiple commit log entries', () => {
        const rawOutput = `
            a1b2c3d|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|feat: initial commit
            e4f5g6h|Jane Smith <jane.smith@example.com>|2023-10-27T11:00:00Z|fix: bug in feature
        `;
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(2);
        expect(commits[0]?.oid).toBe('a1b2c3d');
        expect(commits[1]?.oid).toBe('e4f5g6h');
    });

    it('should handle messages with pipe characters', () => {
        const rawOutput =
            'a1b2c3d|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|feat: something|another thing';
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(1);
        expect(commits[0]?.message).toBe('feat: something|another thing');
    });

    it('should parse log with ANSI escape codes', () => {
        const rawOutput =
            '\x1b[33ma1b2c3d\x1b[m|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|feat: initial commit';
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(1);
        expect(commits[0]?.oid).toBe('a1b2c3d');
    });

    it('should handle author names without email', () => {
        const rawOutput = 'a1b2c3d|John Doe|2023-10-27T10:00:00Z|feat: initial commit';
        const commits = parseGitLog(rawOutput);
        expect(commits[0]?.author).toEqual({ name: 'John Doe', email: '' });
    });

    it('should handle malformed lines gracefully', () => {
        const rawOutput = `
            a1b2c3d|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|feat: initial commit
            this is a malformed line
            e4f5g6h|Jane Smith <jane.smith@example.com>|2023-10-27T11:00:00Z|fix: bug in feature
        `;
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(2);
    });

    it('should handle commit with no message', () => {
        const rawOutput = 'a1b2c3d|John Doe <john.doe@example.com>|2023-10-27T10:00:00Z|';
        const commits = parseGitLog(rawOutput);
        expect(commits).toHaveLength(1);
        expect(commits[0]?.message).toBe('No message');
        expect(commits[0]?.displayName).toBe(null);
    });
});
