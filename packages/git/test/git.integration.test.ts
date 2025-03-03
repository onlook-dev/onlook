import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { GitManager } from '../src/git';

describe('GitManager Integration Tests', () => {
    let gitManager: GitManager;
    let testRepoPath: string;

    beforeEach(async () => {
        // Create a temporary directory for testing
        testRepoPath = path.join(process.cwd(), 'test-repo-' + Date.now());
        fs.mkdirSync(testRepoPath);

        // Create package.json (required by isomorphic-git)
        fs.writeFileSync(
            path.join(testRepoPath, 'package.json'),
            JSON.stringify({ name: 'test-repo', version: '1.0.0' }),
        );

        // Initialize Git repository
        gitManager = new GitManager(testRepoPath);
        await gitManager.init();

        // Create some test files
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Hello World');
        fs.writeFileSync(path.join(testRepoPath, 'test2.txt'), 'Another test file');
    });

    afterEach(() => {
        // Clean up the test directory
        fs.rmSync(testRepoPath, { recursive: true, force: true });
    });

    test('should initialize Git repository', async () => {
        expect(fs.existsSync(path.join(testRepoPath, '.git'))).toBe(true);
        const log = await gitManager.log();
    });

    test('should add files', async () => {
        await gitManager.add('test1.txt');
    });

    test('should add and commit files', async () => {
        // Add all files
        await gitManager.addAll();

        // Commit the files
        const commitMessage = 'Initial commit';
        await gitManager.commit(commitMessage);

        // Verify the commit was created
        const commits = await gitManager.listCommits();
        expect(commits).toHaveLength(1);
        expect(commits[0].commit.message).toBe(commitMessage);
    });
});
