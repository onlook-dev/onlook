// import { invokeMainChannel } from '@/lib/utils';
import type { SandboxSession, Watcher } from '@codesandbox/sdk';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class SandboxManager {
    private session: SandboxSession | null = null;
    private watcher: Watcher | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    register(session: SandboxSession) {
        this.session = session;
    }

    async watchFiles() {
        if (!this.session) {
            return;
        }
        const watcher = await this.session.fs.watch("./", { recursive: true, excludes: [".git"] });

        watcher.onEvent((event) => {
            console.log(event);
        });

        this.watcher = watcher;
    }

    clear() {
        this.watcher?.dispose();
    }

}
