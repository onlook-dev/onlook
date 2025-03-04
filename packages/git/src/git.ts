import fs from 'fs';
import {
    currentBranch,
    add as gitAdd,
    branch as gitBranch,
    checkout as gitCheckout,
    commit as gitCommit,
    init as gitInit,
    log as gitLog,
    remove as gitRemove,
    status as gitStatus,
    statusMatrix as gitStatusMatrix,
    resolveRef,
} from 'isomorphic-git';

const GIT_AUTHOR = { name: 'Onlook', email: 'git@onlook.com' };

export async function init(repoPath: string) {
    await gitInit({ fs, dir: repoPath, defaultBranch: 'main' });
}

export async function add(repoPath: string, filepath: string) {
    await gitAdd({ fs, dir: repoPath, filepath });
}

export async function addAll(repoPath: string) {
    await gitStatusMatrix({ fs, dir: repoPath }).then((status) =>
        Promise.all(
            status.map(([filepath, , worktreeStatus]) =>
                worktreeStatus
                    ? gitAdd({ fs, dir: repoPath, filepath })
                    : gitRemove({ fs, dir: repoPath, filepath }),
            ),
        ),
    );
}

export async function status(repoPath: string, filepath: string = '.') {
    return await gitStatus({ fs, dir: repoPath, filepath });
}

export async function commit(repoPath: string, message: string, author = GIT_AUTHOR) {
    await gitCommit({
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

export async function getCurrentCommit(repoPath: string): Promise<string> {
    const currentBranchName = await currentBranch({ fs, dir: repoPath });
    if (currentBranchName) {
        return await resolveRef({ fs, dir: repoPath, ref: currentBranchName });
    }
    // If not on a branch, resolve HEAD directly
    return await resolveRef({ fs, dir: repoPath, ref: 'HEAD' });
}

export async function getCurrentBranch(repoPath: string): Promise<string | null> {
    const branch = await currentBranch({ fs, dir: repoPath });
    if (!branch) {
        return null;
    }
    return branch;
}
