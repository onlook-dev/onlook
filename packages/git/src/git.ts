import fs from 'fs';
import {
    currentBranch,
    add as gitAdd,
    addNote as gitAddNote,
    branch as gitBranch,
    checkout as gitCheckout,
    commit as gitCommit,
    init as gitInit,
    log as gitLog,
    readNote as gitReadNote,
    remove as gitRemove,
    status as gitStatus,
    statusMatrix as gitStatusMatrix,
    resolveRef,
} from 'isomorphic-git';
import path from 'path';

export interface GitCommit {
    oid: string;
    message: string;
    displayName: string | null;
    author: { name: string; email: string };
    timestamp: number;
}

const GIT_AUTHOR = { name: 'Onlook', email: 'git@onlook.com' };
const DISPLAY_NAME_NAMESPACE = 'onlook-display-name';

export async function isRepoInitialized(dir: string) {
    try {
        // Check if .git directory exists
        const exists = fs.existsSync(path.join(dir, '.git'));
        return exists;
    } catch (error) {
        console.error('Error checking if repository is initialized:', error);
        return false;
    }
}

export async function init(repoPath: string) {
    await gitInit({ fs, dir: repoPath, defaultBranch: 'main' });
}

export async function add(repoPath: string, filepath: string) {
    await gitAdd({ fs, dir: repoPath, filepath });
}

export async function isEmptyCommit(repoPath: string): Promise<boolean> {
    try {
        const changes = (
            await gitStatusMatrix({
                fs,
                dir: repoPath,
            })
        ).filter(
            ([_, HEAD, WORKDIR, STAGE]) =>
                // filter unchanged
                // https://github.com/isomorphic-git/isomorphic-git/issues/865#issuecomment-533028127
                // https://isomorphic-git.org/docs/en/statusMatrix.html
                !(HEAD == 1 && WORKDIR == 1 && STAGE == 1),
        );
        return changes.length === 0;
    } catch (error) {
        console.error('Error checking if commit is empty:', error);
        return false;
    }
}

export async function addAll(repoPath: string) {
    const status = await gitStatusMatrix({ fs, dir: repoPath });
    await Promise.all(
        status.map(async ([filepath, HEAD, worktreeStatus]) => {
            try {
                // If file exists in worktree (worktreeStatus === 1), add it
                // If file doesn't exist in worktree (worktreeStatus === 0) but exists in HEAD (HEAD === 1), remove it
                if (worktreeStatus) {
                    return gitAdd({ fs, dir: repoPath, filepath });
                } else if (HEAD) {
                    return gitRemove({ fs, dir: repoPath, filepath });
                }
            } catch (error) {
                console.error(`Error processing file ${filepath}:`, error);
            }
        }),
    );
}

export async function status(repoPath: string, filepath: string = '.') {
    return await gitStatus({ fs, dir: repoPath, filepath });
}

export async function commit(
    repoPath: string,
    message: string,
    author = GIT_AUTHOR,
): Promise<string> {
    return await gitCommit({
        fs,
        dir: repoPath,
        message,
        author,
    });
}

export async function checkout(repoPath: string, commitHash: string) {
    await gitCheckout({
        fs,
        dir: repoPath,
        ref: commitHash,
        noUpdateHead: true,
        force: true,
    });
}

export async function branch(repoPath: string, branchName: string) {
    await gitBranch({
        fs,
        dir: repoPath,
        ref: branchName,
        checkout: true,
    });
}

export async function log(repoPath: string) {
    return await gitLog({ fs, dir: repoPath });
}

export async function getCommits(repoPath: string): Promise<GitCommit[]> {
    const commits = await gitLog({ fs, dir: repoPath });
    return Promise.all(
        commits.map(async (commit) => ({
            oid: commit.oid,
            message: commit.commit.message,
            author: commit.commit.author,
            timestamp: commit.commit.author.timestamp,
            displayName: await getCommitDisplayName(repoPath, commit.oid),
        })),
    );
}

export async function getCurrentCommit(repoPath: string): Promise<string> {
    const currentBranchName = await currentBranch({ fs, dir: repoPath });
    if (!currentBranchName) {
        throw new Error('Not on any branch');
    }
    const commit = await resolveRef({ fs, dir: repoPath, ref: currentBranchName });
    return commit;
}

export async function getCurrentBranch(repoPath: string): Promise<string | null> {
    const branch = await currentBranch({ fs, dir: repoPath });
    if (!branch) {
        return null;
    }
    return branch;
}

export async function updateCommitDisplayName(repoPath: string, oid: string, newName: string) {
    await gitAddNote({
        fs,
        dir: repoPath,
        oid: oid,
        note: newName,
        ref: `refs/notes/${DISPLAY_NAME_NAMESPACE}`,
        force: true,
        author: GIT_AUTHOR,
    });
}

export async function getCommitDisplayName(repoPath: string, oid: string): Promise<string | null> {
    try {
        const note = await gitReadNote({
            fs,
            dir: repoPath,
            oid: oid,
            ref: `refs/notes/${DISPLAY_NAME_NAMESPACE}`,
        });
        return Buffer.from(note).toString('utf8');
    } catch (error) {
        return null;
    }
}
