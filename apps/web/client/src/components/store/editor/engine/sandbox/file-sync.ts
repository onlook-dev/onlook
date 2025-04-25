import type { SandboxSession } from "@codesandbox/sdk";

export class FileSyncManager {
    private session: SandboxSession;
    private cache: Map<string, string>;

    constructor(session: SandboxSession) {
        this.cache = new Map();
        this.session = session;
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    async readOrFetch(filePath: string): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) || null;
        }

        const content = await this.session.fs.readTextFile(filePath);
        this.cache.set(filePath, content);
        return content;
    }

    async write(filePath: string, content: string): Promise<void> {
        if (!this.session) {
            console.error('No session found');
            return;
        }

        await this.session.fs.writeTextFile(filePath, content);
        this.cache.set(filePath, content);
    }


    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
    }


    delete(filePath: string) {
        this.cache.delete(filePath);
    }

    listFiles() {
        return Array.from(this.cache.keys());
    }

    clear() {
        this.cache.clear();
    }
}
