import type { SandboxSession, Watcher } from '@codesandbox/sdk';
import { IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { addOidsToAst, getAstFromContent, getContentFromAst } from '@onlook/parser';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { FileSyncManager } from './file-sync';

export class SandboxManager {
    private session: SandboxSession | null = null;
    private watcher: Watcher | null = null;
    private fileSync: FileSyncManager | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    init(session: SandboxSession) {
        this.session = session;
        this.fileSync = new FileSyncManager(session);
    }

    async index() {
        if (!this.session) {
            console.error('No session found');
            return;
        }

        const files = await this.listFilesRecursively('./', IGNORED_DIRECTORIES, JSX_FILE_EXTENSIONS);
        for (const file of files) {
            const content = await this.readFile(file);
            if (!content) {
                console.error(`Failed to read file ${file}`);
                continue;
            }

            const ast = await getAstFromContent(content);
            if (!ast) {
                console.error(`Failed to get ast for file ${file}`);
                continue;
            }

            const astWithIds = addOidsToAst(ast);
            const contentWithIds = await getContentFromAst(astWithIds);
            await this.writeFile(file, contentWithIds);
        }
    }

    async readFile(path: string): Promise<string | null> {
        if (!this.fileSync) {
            console.error('No file cache found');
            return null;
        }

        return this.fileSync.readOrFetch(path);
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.fileSync) {
            console.error('No file cache found');
            return false;
        }

        await this.fileSync.write(path, content);
        return true;
    }

    async listFilesRecursively(dir: string, ignore: string[] = [], extensions: string[] = []): Promise<string[]> {
        if (!this.session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this.session.fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = dir === './' ? entry.name : `${dir}/${entry.name}`;
            if (entry.type === 'directory') {
                const dirName = entry.name;
                if (ignore.includes(dirName)) {
                    continue;
                }
                const subFiles = await this.listFilesRecursively(fullPath, ignore, extensions);
                results.push(...subFiles);
            } else {
                if (extensions.length > 0 && !extensions.includes(entry.name.split('.').pop() || '')) {
                    continue;
                }
                results.push(fullPath);
            }
        }

        return results;
    }

    async watchFiles() {
        if (!this.session) {
            console.error('No session found');
            return;
        }

        const watcher = await this.session.fs.watch("./", { recursive: true, excludes: IGNORED_DIRECTORIES });

        watcher.onEvent((event) => {
            if (!this.fileSync) {
                console.error('No file cache found');
                return;
            }

            for (const path of event.paths) {
                this.fileSync.updateCache(path, event.type);
            }
        });

        this.watcher = watcher;
    }

    clear() {
        this.watcher?.dispose();
        this.fileSync?.clear();
        this.session = null;
    }
}
