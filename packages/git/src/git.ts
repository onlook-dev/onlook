import fs from 'fs';
import { globby } from 'globby';
import { add, checkout, commit } from 'isomorphic-git';

export class GitManager {
    constructor(private readonly repoPath: string) {
        this.repoPath = repoPath;
    }

    async addAll() {
        const paths = await globby(['./**', './**/.*'], { gitignore: true });
        for (const filepath of paths) {
            await add({ fs, dir: this.repoPath, filepath });
        }
    }

    async commit(message: string) {
        await commit({ fs, dir: this.repoPath, message });
    }

    async checkout(commitHash: string) {
        await checkout({ fs, dir: this.repoPath, ref: commitHash });
    }
}
