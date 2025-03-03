import { beforeEach, describe, expect, mock, test } from 'bun:test';
import fs from 'fs';
import { globby } from 'globby';
import { add, checkout, commit } from 'isomorphic-git';
import { GitManager } from '../src/git';

// Mock the external dependencies
mock.module('isomorphic-git', () => ({
    add: mock(() => Promise.resolve()),
    commit: mock(() => Promise.resolve()),
    checkout: mock(() => Promise.resolve()),
}));

mock.module('globby', () => ({
    globby: mock(() => Promise.resolve(['./file1.txt', './file2.txt'])),
}));

describe('GitManager', () => {
    let gitManager: GitManager;
    const testRepoPath = '/test/repo/path';

    beforeEach(() => {
        gitManager = new GitManager(testRepoPath);
    });

    describe('addAll', () => {
        test('should add all files to git', async () => {
            await gitManager.addAll();

            expect(globby).toHaveBeenCalledWith(['./**', './**/.*'], { gitignore: true });

            expect(add).toHaveBeenCalledTimes(2);
            expect(add).toHaveBeenCalledWith({
                fs,
                dir: testRepoPath,
                filepath: './file1.txt',
            });
            expect(add).toHaveBeenCalledWith({
                fs,
                dir: testRepoPath,
                filepath: './file2.txt',
            });
        });
    });

    describe('commit', () => {
        test('should commit with the given message', async () => {
            const commitMessage = 'test commit';
            await gitManager.commit(commitMessage);

            expect(commit).toHaveBeenCalledWith({
                fs,
                dir: testRepoPath,
                message: commitMessage,
            });
        });
    });

    describe('checkout', () => {
        test('should checkout the specified commit', async () => {
            const commitHash = 'abc123';
            await gitManager.checkout(commitHash);

            expect(checkout).toHaveBeenCalledWith({
                fs,
                dir: testRepoPath,
                ref: commitHash,
            });
        });
    });
});
