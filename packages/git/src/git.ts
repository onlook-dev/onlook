import fs from 'fs';
import {
    add,
    branch,
    checkout,
    commit,
    init,
    log,
    remove,
    status,
    statusMatrix,
    type ReadCommitResult,
} from 'isomorphic-git';

const GIT_AUTHOR = { name: 'Onlook', email: 'git@onlook.com' };
export class GitManager {
    constructor(private readonly repoPath: string) {
        this.repoPath = repoPath;
    }

    async init() {
        await init({ fs, dir: this.repoPath });
    }

    async add(filepath: string) {
        await add({ fs, dir: this.repoPath, filepath });
    }

    async addAll() {
        await statusMatrix({ fs, dir: this.repoPath }).then((status) =>
            Promise.all(
                status.map(([filepath, , worktreeStatus]) =>
                    worktreeStatus
                        ? add({ fs, dir: this.repoPath, filepath })
                        : remove({ fs, dir: this.repoPath, filepath }),
                ),
            ),
        );
    }

    async status(filepath: string = '.') {
        return await status({ fs, dir: this.repoPath, filepath });
    }

    async commit(message: string, author = GIT_AUTHOR) {
        await commit({
            fs,
            dir: this.repoPath,
            message,
            author,
        });
    }

    async checkout(commitHash: string) {
        await checkout({ fs, dir: this.repoPath, ref: commitHash });
    }

    async listCommits(): Promise<ReadCommitResult[]> {
        const commits = await log({ fs, dir: this.repoPath });
        return commits;
    }

    async branch(branchName: string) {
        await branch({
            fs,
            dir: this.repoPath,
            ref: branchName,
            checkout: true,
        });
    }
}
