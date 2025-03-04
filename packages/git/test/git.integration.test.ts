import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { GitManager } from '../src/git';

describe('GitManager Integration Tests', () => {
    let gitManager: GitManager;
    let testRepoPath: string;

    beforeEach(async () => {
        // Create a temporary directory for testing with a shorter path
        testRepoPath = 'git-test-' + Date.now();
        fs.mkdirSync(testRepoPath, { recursive: true });

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
    });

    test('should add files', async () => {
        await gitManager.add('test1.txt');
        // Verify file was added by committing and checking if it appears in the commit
        await gitManager.commit('Add test1.txt');
        const commits = await gitManager.listCommits();
        expect(commits).toHaveLength(1);
    });

    test('should add files', async () => {
        const status = await gitManager.status('test1.txt');
        expect(status).toBe('*added');

        await gitManager.add('test1.txt');
        // Verify file was added by committing and checking if it appears in the commit
        const status1 = await gitManager.status('test1.txt');
        expect(status1).toBe('added');
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
        expect(commits[0].commit.message.trim()).toBe(commitMessage);
    });

    test('should include deleted files in addAll', async () => {
        // First commit all files
        await gitManager.addAll();
        await gitManager.commit('Initial commit');

        // Delete a file
        fs.unlinkSync(path.join(testRepoPath, 'test1.txt'));

        // Check status before addAll
        const statusBeforeAdd = await gitManager.status('test1.txt');
        expect(statusBeforeAdd).toBe('*deleted');

        // Add all changes including deleted file
        await gitManager.addAll();

        // Check status after addAll
        const statusAfterAdd = await gitManager.status('test1.txt');
        expect(statusAfterAdd).toBe('deleted');
    });

    test('should create and switch branches', async () => {
        // First commit to master branch
        await gitManager.addAll();
        await gitManager.commit('Initial commit');

        // Create a new branch
        const branchName = 'feature-branch';
        await gitManager.branch(branchName);

        // Modify a file in the new branch
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Modified in feature branch');
        await gitManager.add('test1.txt');
        await gitManager.commit('Feature branch commit');

        // Switch back to master
        await gitManager.checkout('master');

        // Verify file content is from master branch
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe('Hello World');

        // Switch to feature branch again
        await gitManager.checkout(branchName);

        // Verify file content is from feature branch
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe(
            'Modified in feature branch',
        );
    });

    test('should revert changes', async () => {
        // First commit
        await gitManager.addAll();
        await gitManager.commit('Initial commit');

        // Modify a file
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Modified content');
        await gitManager.add('test1.txt');
        await gitManager.commit('Modification commit');

        // Verify file is modified
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe(
            'Modified content',
        );

        // Get the commit history
        const commits = await gitManager.listCommits();

        // Revert to the initial commit
        await gitManager.checkout(commits[1].oid);

        // Verify file is reverted
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe('Hello World');
    });
});
