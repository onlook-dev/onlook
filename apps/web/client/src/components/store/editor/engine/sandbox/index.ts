// import { invokeMainChannel } from '@/lib/utils';
import type { SandboxSession, Watcher } from '@codesandbox/sdk';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class SandboxManager {
    private session: SandboxSession | null = null;
    private watcher: Watcher | null = null;
    private selfModified = new Set<string>();
    private fileCache = new Map<string, string>();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    register(session: SandboxSession) {
        this.session = session;
    }

    async readFile(path: string): Promise<string | null> {
        if (!this.session) {
            return null;
        }

        try {
            if (this.fileCache.has(path)) {
                return this.fileCache.get(path) || null;
            }

            const content = await this.session.fs.readTextFile(path);
            this.fileCache.set(path, content);
            return content;
        } catch (error) {
            console.error(`Error reading file ${path}:`, error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.session) {
            return false;
        }

        try {
            this.selfModified.add(path);
            await this.session.fs.writeTextFile(path, content);
            this.fileCache.set(path, content);
            return true;
        } catch (error) {
            console.error(`Error writing file ${path}:`, error);
            return false;
        }
    }

    async listFiles(): Promise<string[]> {
        console.log('listFiles', this.session);
        if (!this.session) {
            return [];
        }
        const files = await this.session.fs.readdir('./');
        console.log('files', files);
        return files.map(entry => entry.name);
    }

    async watchFiles() {
        if (!this.session) {
            return;
        }
        const watcher = await this.session.fs.watch("./", { recursive: true, excludes: [".git"] });

        watcher.onEvent((event) => {
            for (const path of event.paths) {
                if (this.selfModified.has(path)) {
                    this.selfModified.delete(path);
                    return;
                }
                if (event.type === "change" || event.type === "add") {
                    this.fileCache.delete(path);

                    this.readFile(path).catch(error => {
                        console.error(`Error reading updated file ${path}:`, error);
                    });
                }
            }
        });

        this.watcher = watcher;
    }

    clear() {
        this.watcher?.dispose();
        this.selfModified.clear();
        this.fileCache.clear();
    }
}
