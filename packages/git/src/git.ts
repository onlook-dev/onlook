import { add, checkout, commit, init, log, remove, status, statusMatrix } from 'isomorphic-git';
import fsSync from 'node:fs';
const { promises, ...isoGitFs } = fsSync;

export class GitManager {
    constructor(private readonly repoPath: string) {
        this.repoPath = repoPath;
    }

    async init() {
        await init({ fs: isoGitFs, dir: this.repoPath });
    }

    async log() {
        return await log({ fs: isoGitFs, dir: this.repoPath });
    }

    async add(filepath: string) {
        await add({ fs: isoGitFs, dir: this.repoPath, filepath });
    }

    async addAll() {
        await statusMatrix({ fs: isoGitFs, dir: this.repoPath }).then((status) =>
            Promise.all(
                status.map(([filepath, , worktreeStatus]) =>
                    worktreeStatus
                        ? add({ fs: isoGitFs, dir: this.repoPath, filepath })
                        : remove({ fs: isoGitFs, dir: this.repoPath, filepath }),
                ),
            ),
        );
    }

    async status() {
        return await status({ fs: isoGitFs, dir: this.repoPath, filepath: '.' });
    }

    async commit(message: string) {
        await commit({ fs: isoGitFs, dir: this.repoPath, message });
    }

    async checkout(commitHash: string) {
        await checkout({ fs: isoGitFs, dir: this.repoPath, ref: commitHash });
    }

    async listCommits() {
        const commits = await log({ fs: isoGitFs, dir: this.repoPath });
        return commits;
    }
}
