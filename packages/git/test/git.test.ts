import { describe, expect, it } from 'vitest';
import { parseGitLog, parseGitStatusOutput } from '../src/git';

describe('parseGitStatusOutput', () => {
    it('should return an empty array for empty input', () => {
        expect(parseGitStatusOutput('')).toEqual([]);
    });

    it('should parse standard git status output', () => {
        const output = ' M src/git.ts\n D src/main.ts\n?? new-file.ts';
        const expected = ['src/git.ts', 'src/main.ts', 'new-file.ts'];
        expect(parseGitStatusOutput(output)).toEqual(expected);
    });

    it('should handle renamed files', () => {
        const output = 'R  src/old.ts -> src/new.ts';
        const expected = ['src/new.ts'];
        expect(parseGitStatusOutput(output)).toEqual(expected);
    });

    it('should handle lines with leading spaces', () => {
        const output = '  D src/main.ts';
        const expected = ['src/main.ts'];
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
            timestamp: 1698400800,
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
