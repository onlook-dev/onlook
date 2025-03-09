import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
    add,
    addAll,
    branch,
    checkout,
    commit,
    getCommitDisplayName,
    getCurrentCommit,
    init,
    isEmptyCommit,
    isRepoInitialized,
    log,
    status,
    updateCommitDisplayName,
} from '../src/git';

describe('GitManager Integration Tests', () => {
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
        await init(testRepoPath);

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

    test('should correctly detect if repository is initialized', async () => {
        // Test initialized repo
        expect(await isRepoInitialized(testRepoPath)).toBe(true);

        // Delete the .git directory
        fs.rmSync(path.join(testRepoPath, '.git'), { recursive: true, force: true });

        // Test non-initialized repo
        expect(await isRepoInitialized(testRepoPath)).toBe(false);
    });

    test('should add files', async () => {
        await add(testRepoPath, 'test1.txt');
        // Verify file was added by committing and checking if it appears in the commit
        await commit(testRepoPath, 'Add test1.txt');
        const commits = await log(testRepoPath);
        expect(commits).toHaveLength(1);
    });

    test('should add files', async () => {
        const res = await status(testRepoPath, 'test1.txt');
        expect(res).toBe('*added');

        await add(testRepoPath, 'test1.txt');
        // Verify file was added by committing and checking if it appears in the commit
        const res1 = await status(testRepoPath, 'test1.txt');
        expect(res1).toBe('added');
    });

    test('should add and commit files', async () => {
        // Add all files
        await addAll(testRepoPath);

        // Commit the files
        const commitMessage = 'Initial commit';
        await commit(testRepoPath, commitMessage);

        // Verify the commit was created
        const commits = await log(testRepoPath);
        expect(commits).toHaveLength(1);
        expect(commits[0].commit.message.trim()).toBe(commitMessage);
    });

    test('should include deleted files in addAll', async () => {
        // First commit all files
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Delete a file
        fs.unlinkSync(path.join(testRepoPath, 'test1.txt'));

        // Check status before addAll
        const statusBeforeAdd = await status(testRepoPath, 'test1.txt');
        expect(statusBeforeAdd).toBe('*deleted');

        // Add all changes including deleted file
        await addAll(testRepoPath);

        // Check status after addAll
        const statusAfterAdd = await status(testRepoPath, 'test1.txt');
        expect(statusAfterAdd).toBe('deleted');
    });

    test('should create and switch branches', async () => {
        // First commit to main branch
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Create a new branch
        const branchName = 'feature-branch';
        await branch(testRepoPath, branchName);

        // Modify a file in the new branch
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Modified in feature branch');
        await add(testRepoPath, 'test1.txt');
        await commit(testRepoPath, 'Feature branch commit');

        // Switch back to main
        await checkout(testRepoPath, 'main');

        // Verify file content is from main branch
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe('Hello World');

        // Switch to feature branch again
        await checkout(testRepoPath, branchName);

        // Verify file content is from feature branch
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe(
            'Modified in feature branch',
        );
    });

    test('should revert changes', async () => {
        // First commit
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Modify a file
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Modified content');
        await add(testRepoPath, 'test1.txt');
        await commit(testRepoPath, 'Modification commit');

        // Verify file is modified
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe(
            'Modified content',
        );

        // Get the commit history
        const commits = await log(testRepoPath);

        // Revert to the initial commit
        await checkout(testRepoPath, commits[1].oid);

        // Verify file is reverted
        expect(fs.readFileSync(path.join(testRepoPath, 'test1.txt'), 'utf8')).toBe('Hello World');
    });

    test('should get current commit hash', async () => {
        // First commit to get a valid commit hash
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Get the current commit hash
        const currentCommit = await getCurrentCommit(testRepoPath);

        // Get the commit history to verify the hash
        const commits = await log(testRepoPath);
        expect(currentCommit).toBe(commits[0].oid);
    });

    test('should set and get commit display name', async () => {
        // First commit to get a valid commit hash
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Get the commit hash
        const commits = await log(testRepoPath);
        const commitHash = commits[0].oid;

        // Initially, display name should be null
        const initialDisplayName = await getCommitDisplayName(testRepoPath, commitHash);
        expect(initialDisplayName).toBeNull();

        // Set a display name
        const displayName = 'My Custom Display Name';
        await updateCommitDisplayName(testRepoPath, commitHash, displayName);

        // Verify the display name was set correctly
        const retrievedDisplayName = await getCommitDisplayName(testRepoPath, commitHash);
        expect(retrievedDisplayName).toBe(displayName);
    });

    test('should update existing commit display name', async () => {
        // First commit to get a valid commit hash
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // Get the commit hash
        const commits = await log(testRepoPath);
        const commitHash = commits[0].oid;

        // Set initial display name
        const initialDisplayName = 'Initial Display Name';
        await updateCommitDisplayName(testRepoPath, commitHash, initialDisplayName);

        // Update the display name
        const updatedDisplayName = 'Updated Display Name';
        await updateCommitDisplayName(testRepoPath, commitHash, updatedDisplayName);

        // Verify the display name was updated correctly
        const retrievedDisplayName = await getCommitDisplayName(testRepoPath, commitHash);
        expect(retrievedDisplayName).toBe(updatedDisplayName);
    });

    test('should detect changes in repository', async () => {
        // Initially there should be changes (untracked files)
        expect(await isEmptyCommit(testRepoPath)).toBe(false);

        // Add and commit all files
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Initial commit');

        // No changes after committing everything
        expect(await isEmptyCommit(testRepoPath)).toBe(true);

        // Make a change to a file
        fs.writeFileSync(path.join(testRepoPath, 'test1.txt'), 'Modified content');

        // Should detect the change
        expect(await isEmptyCommit(testRepoPath)).toBe(false);

        // Add and commit the changes
        await addAll(testRepoPath);
        await commit(testRepoPath, 'Modified content');

        // No changes after committing everything
        expect(await isEmptyCommit(testRepoPath)).toBe(true);
    });
});
