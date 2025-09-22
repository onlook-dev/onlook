/**
 * Wraps ZenFS to provide a more convenient API for managing project branches.
 *
 * The intent is to handle core postprocessing of file writes
 * For example, if a file is a JSX file, we need to process it to add OIDs.
 * We also need to handle the index of the file system.
 *
 * @see https://github.com/zenfs/zenfs
 */

import { configure, fs } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

export class OnlookFS {
    private fs: typeof fs | null = null;
    private isInitialized = false;

    async initialize(projectId: string, branchId: string): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        await configure({
            mounts: {
                '/': await IndexedDB.create({
                    storeName: `onlook-${projectId}-${branchId}`,
                }),
            },
        });

        this.fs = fs;

        this.isInitialized = true;
    }

    private ensureInitialized(): void {
        if (!this.fs) {
            throw new Error('OnlookFS not initialized. Call initialize() first.');
        }
    }

    async readFile(path: string): Promise<Buffer>;
    async readFile(path: string, encoding: 'utf8' | undefined): Promise<string>;
    async readFile(path: string, encoding?: 'utf8'): Promise<Buffer | string> {
        this.ensureInitialized();
        return this.fs!.promises.readFile(path, { encoding });
    }

    async writeFile(path: string, data: string | Buffer): Promise<void> {
        this.ensureInitialized();
        return this.fs!.promises.writeFile(path, data);
    }

    async readdir(path: string): Promise<string[]> {
        this.ensureInitialized();
        const entries = await this.fs!.promises.readdir(path);
        return entries.map((entry) => entry.toString());
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        this.ensureInitialized();
        await this.fs!.promises.mkdir(path, options);
    }

    async unlink(path: string): Promise<void> {
        this.ensureInitialized();
        return this.fs!.promises.unlink(path);
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        this.ensureInitialized();
        return this.fs!.promises.rename(oldPath, newPath);
    }

    async stat(path: string) {
        this.ensureInitialized();
        return this.fs!.promises.stat(path);
    }

    async exists(path: string): Promise<boolean> {
        this.ensureInitialized();
        return this.fs!.promises.exists(path);
    }

    async rmdir(path: string): Promise<void> {
        this.ensureInitialized();
        return this.fs!.promises.rmdir(path);
    }

    watch(path: string, callback: (eventType: string, filename: string | null) => void) {
        this.ensureInitialized();
        return this.fs!.watch(path, callback);
    }
}
