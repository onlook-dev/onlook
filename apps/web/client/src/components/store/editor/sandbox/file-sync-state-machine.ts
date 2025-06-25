import { convertToBase64 } from '@onlook/utility';
import localforage from 'localforage';
import { makeAutoObservable } from 'mobx';

type FileState = 'clean' | 'dirty' | 'syncing' | 'conflict';

interface FileStateData {
    state: FileState;
    content: string;
    lastRemoteContent?: string;
    lastModified: number;
}

interface BinaryFileStateData {
    state: FileState;
    content: Uint8Array;
    lastModified: number;
}

export class StateMachineFileSyncManager {
    private fileStates = new Map<string, FileStateData>();
    private binaryFileStates = new Map<string, BinaryFileStateData>();
    private pendingWrites = new Map<string, string>();
    private pendingBinaryWrites = new Map<string, Uint8Array>();
    private syncPromises = new Map<string, Promise<void>>();
    
    private readonly storageKey = 'state-machine-file-cache';
    private readonly binaryStorageKey = 'state-machine-binary-cache';

    constructor() {
        makeAutoObservable(this);
        this.restoreFromLocalStorage();
    }

    /**
     * Save file with state machine logic
     */
    async saveFile(
        filePath: string, 
        content: string,
        writeRemote: (path: string, content: string) => Promise<boolean>
    ): Promise<boolean> {
        const currentStateData = this.fileStates.get(filePath);
        const currentState = currentStateData?.state || 'clean';
        
        console.log(`[StateMachine] saveFile ${filePath} - current state: ${currentState}`);
        
        switch (currentState) {
            case 'clean':
            case 'dirty':
                await this.saveToLocal(filePath, content);
                this.setState(filePath, 'dirty');
                return this.scheduleRemoteSync(filePath, content, writeRemote);
                
            case 'syncing':
                // Queue the write for after sync completes
                this.pendingWrites.set(filePath, content);
                await this.saveToLocal(filePath, content);
                console.log(`[StateMachine] Queued write for ${filePath} during sync`);
                return true;
                
            case 'conflict':
                // In conflict state, prioritize local changes
                console.log(`[StateMachine] Resolving conflict for ${filePath} with local write`);
                await this.saveToLocal(filePath, content);
                this.setState(filePath, 'dirty');
                return this.scheduleRemoteSync(filePath, content, writeRemote);
        }
    }

    /**
     * Save binary file with state machine logic
     */
    async saveBinaryFile(
        filePath: string,
        content: Uint8Array,
        writeRemote: (path: string, content: Uint8Array) => Promise<boolean>
    ): Promise<boolean> {
        const currentStateData = this.binaryFileStates.get(filePath);
        const currentState = currentStateData?.state || 'clean';
        
        switch (currentState) {
            case 'clean':
            case 'dirty':
                await this.saveBinaryToLocal(filePath, content);
                this.setBinaryState(filePath, 'dirty');
                return this.scheduleBinaryRemoteSync(filePath, content, writeRemote);
                
            case 'syncing':
                this.pendingBinaryWrites.set(filePath, content);
                await this.saveBinaryToLocal(filePath, content);
                return true;
                
            case 'conflict':
                await this.saveBinaryToLocal(filePath, content);
                this.setBinaryState(filePath, 'dirty');
                return this.scheduleBinaryRemoteSync(filePath, content, writeRemote);
        }
    }

    /**
     * Handle remote file changes from file watcher
     */
    async onRemoteChange(
        filePath: string,
        remoteContent: string
    ): Promise<{ contentChanged: boolean; shouldProcess: boolean }> {
        const currentStateData = this.fileStates.get(filePath);
        const currentState = currentStateData?.state || 'clean';
        
        console.log(`[StateMachine] onRemoteChange ${filePath} - current state: ${currentState}`);
        
        switch (currentState) {
            case 'clean':
                // Safe to sync from remote
                const existingContent = currentStateData?.content;
                const contentChanged = existingContent !== remoteContent;
                
                if (contentChanged) {
                    await this.saveToLocal(filePath, remoteContent);
                    this.setState(filePath, 'clean', remoteContent);
                }
                
                return { contentChanged, shouldProcess: contentChanged };
                
            case 'dirty':
            case 'syncing':
                // Don't overwrite local changes, but check for conflicts
                const localContent = currentStateData?.content || '';
                if (localContent !== remoteContent) {
                    console.log(`[StateMachine] Conflict detected for ${filePath}`);
                    this.setState(filePath, 'conflict', remoteContent);
                    return { contentChanged: true, shouldProcess: false };
                }
                return { contentChanged: false, shouldProcess: false };
                
            case 'conflict':
                // Update the remote content reference but don't overwrite local
                this.setState(filePath, 'conflict', remoteContent);
                return { contentChanged: true, shouldProcess: false };
        }
    }

    /**
     * Schedule remote sync with retry logic
     */
    private async scheduleRemoteSync(
        filePath: string, 
        content: string,
        writeRemote: (path: string, content: string) => Promise<boolean>
    ): Promise<boolean> {
        // If already syncing this file, wait for completion
        const existingSync = this.syncPromises.get(filePath);
        if (existingSync) {
            await existingSync;
        }

        const syncPromise = this.performRemoteSync(filePath, content, writeRemote);
        this.syncPromises.set(filePath, syncPromise);
        
        try {
            await syncPromise;
            return true;
        } finally {
            this.syncPromises.delete(filePath);
        }
    }

    private async performRemoteSync(
        filePath: string,
        content: string,
        writeRemote: (path: string, content: string) => Promise<boolean>
    ): Promise<void> {
        this.setState(filePath, 'syncing');
        
        try {
            const success = await writeRemote(filePath, content);
            if (!success) {
                throw new Error(`Failed to write remote file ${filePath}`);
            }
            
            // Check if there were pending writes during sync
            const pendingContent = this.pendingWrites.get(filePath);
            if (pendingContent) {
                this.pendingWrites.delete(filePath);
                this.setState(filePath, 'dirty');
                // Schedule another sync for the pending content
                this.scheduleRemoteSync(filePath, pendingContent, writeRemote);
            } else {
                this.setState(filePath, 'clean');
            }
        } catch (error) {
            console.error(`[StateMachine] Sync failed for ${filePath}:`, error);
            this.setState(filePath, 'dirty');
            // Could implement retry logic here
        }
    }

    private async scheduleBinaryRemoteSync(
        filePath: string,
        content: Uint8Array,
        writeRemote: (path: string, content: Uint8Array) => Promise<boolean>
    ): Promise<boolean> {
        this.setBinaryState(filePath, 'syncing');
        
        try {
            const success = await writeRemote(filePath, content);
            if (!success) {
                throw new Error(`Failed to write remote binary file ${filePath}`);
            }
            
            const pendingContent = this.pendingBinaryWrites.get(filePath);
            if (pendingContent) {
                this.pendingBinaryWrites.delete(filePath);
                this.setBinaryState(filePath, 'dirty');
                return this.scheduleBinaryRemoteSync(filePath, pendingContent, writeRemote);
            } else {
                this.setBinaryState(filePath, 'clean');
                return true;
            }
        } catch (error) {
            console.error(`[StateMachine] Binary sync failed for ${filePath}:`, error);
            this.setBinaryState(filePath, 'dirty');
            return false;
        }
    }

    /**
     * Read file from cache or mark as tracking
     */
    async readOrFetch(
        filePath: string,
        readRemote: (path: string) => Promise<string | null>
    ): Promise<string | null> {
        const stateData = this.fileStates.get(filePath);
        
        if (stateData) {
            return stateData.content;
        }

        try {
            const content = await readRemote(filePath);
            if (content === null) {
                return null;
            }
            
            await this.saveToLocal(filePath, content);
            this.setState(filePath, 'clean');
            return content;
        } catch (error) {
            console.error(`[StateMachine] Error reading file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Get current file state for debugging
     */
    getFileState(filePath: string): FileState {
        return this.fileStates.get(filePath)?.state || 'clean';
    }

    /**
     * Get files in conflict state
     */
    getConflictFiles(): string[] {
        return Array.from(this.fileStates.entries())
            .filter(([_, data]) => data.state === 'conflict')
            .map(([path]) => path);
    }

    /**
     * Force resolve conflict by accepting local changes
     */
    async resolveConflictWithLocal(
        filePath: string,
        writeRemote: (path: string, content: string) => Promise<boolean>
    ): Promise<boolean> {
        const stateData = this.fileStates.get(filePath);
        if (!stateData || stateData.state !== 'conflict') {
            return false;
        }

        this.setState(filePath, 'dirty');
        return this.scheduleRemoteSync(filePath, stateData.content, writeRemote);
    }

    /**
     * Force resolve conflict by accepting remote changes
     */
    async resolveConflictWithRemote(filePath: string): Promise<boolean> {
        const stateData = this.fileStates.get(filePath);
        if (!stateData || stateData.state !== 'conflict' || !stateData.lastRemoteContent) {
            return false;
        }

        await this.saveToLocal(filePath, stateData.lastRemoteContent);
        this.setState(filePath, 'clean', stateData.lastRemoteContent);
        return true;
    }

    private async saveToLocal(filePath: string, content: string): Promise<void> {
        const stateData = this.fileStates.get(filePath) || {
            state: 'clean',
            content: '',
            lastModified: Date.now()
        };
        
        this.fileStates.set(filePath, {
            ...stateData,
            content,
            lastModified: Date.now()
        });

        await this.saveToLocalStorage();
    }

    private async saveBinaryToLocal(filePath: string, content: Uint8Array): Promise<void> {
        const stateData = this.binaryFileStates.get(filePath) || {
            state: 'clean',
            content: new Uint8Array(0),
            lastModified: Date.now()
        };
        
        this.binaryFileStates.set(filePath, {
            ...stateData,
            content,
            lastModified: Date.now()
        });

        await this.saveToLocalStorage();
    }

    private setState(filePath: string, state: FileState, lastRemoteContent?: string): void {
        const currentData = this.fileStates.get(filePath);
        if (!currentData) {
            // If file doesn't exist, create it first
            this.fileStates.set(filePath, {
                state: 'clean',
                content: '',
                lastModified: Date.now()
            });
            // Then set the desired state
            const newData = this.fileStates.get(filePath)!;
            this.fileStates.set(filePath, {
                ...newData,
                state,
                lastRemoteContent: lastRemoteContent ?? newData.lastRemoteContent,
                lastModified: Date.now()
            });
            console.log(`[StateMachine] ${filePath} state: new → ${state}`);
            return;
        }

        this.fileStates.set(filePath, {
            ...currentData,
            state,
            lastRemoteContent: lastRemoteContent ?? currentData.lastRemoteContent,
            lastModified: Date.now()
        });

        console.log(`[StateMachine] ${filePath} state: ${currentData.state} → ${state}`);
    }

    private setBinaryState(filePath: string, state: FileState): void {
        const currentData = this.binaryFileStates.get(filePath);
        if (!currentData) {
            // Create default binary state data if it doesn't exist
            this.binaryFileStates.set(filePath, {
                state,
                content: new Uint8Array(0),
                lastModified: Date.now()
            });
            return;
        }

        this.binaryFileStates.set(filePath, {
            ...currentData,
            state,
            lastModified: Date.now()
        });
    }

    // Storage methods
    private async restoreFromLocalStorage(): Promise<void> {
        try {
            const storedData = await localforage.getItem<Record<string, any>>(this.storageKey);
            if (storedData) {
                Object.entries(storedData).forEach(([path, data]) => {
                    this.fileStates.set(path, {
                        ...data,
                        state: 'clean' // Reset all to clean on startup
                    });
                });
            }

            const storedBinaryData = await localforage.getItem<Record<string, any>>(this.binaryStorageKey);
            if (storedBinaryData) {
                Object.entries(storedBinaryData).forEach(([path, data]) => {
                    const binaryContent = new Uint8Array(atob(data.content).split('').map(c => c.charCodeAt(0)));
                    this.binaryFileStates.set(path, {
                        ...data,
                        content: binaryContent,
                        state: 'clean'
                    });
                });
            }
        } catch (error) {
            console.error('[StateMachine] Error restoring from storage:', error);
        }
    }

    private async saveToLocalStorage(): Promise<void> {
        try {
            const dataToStore: Record<string, any> = {};
            this.fileStates.forEach((data, path) => {
                dataToStore[path] = data;
            });
            await localforage.setItem(this.storageKey, dataToStore);

            const binaryDataToStore: Record<string, any> = {};
            this.binaryFileStates.forEach((data, path) => {
                binaryDataToStore[path] = {
                    ...data,
                    content: convertToBase64(data.content)
                };
            });
            await localforage.setItem(this.binaryStorageKey, binaryDataToStore);
        } catch (error) {
            console.error('[StateMachine] Error saving to storage:', error);
        }
    }

    listAllFiles(): string[] {
        return [
            ...Array.from(this.fileStates.keys()),
            ...Array.from(this.binaryFileStates.keys())
        ];
    }

    async delete(filePath: string): Promise<void> {
        this.fileStates.delete(filePath);
        this.binaryFileStates.delete(filePath);
        this.pendingWrites.delete(filePath);
        this.pendingBinaryWrites.delete(filePath);
        await this.saveToLocalStorage();
    }

    async clear(): Promise<void> {
        this.fileStates.clear();
        this.binaryFileStates.clear();
        this.pendingWrites.clear();
        this.pendingBinaryWrites.clear();
        this.syncPromises.clear();
        
        await localforage.removeItem(this.storageKey);
        await localforage.removeItem(this.binaryStorageKey);
    }

    /**
     * Batch read multiple files in parallel - compatibility method
     */
    async readOrFetchBatch(
        filePaths: string[],
        readRemote: (path: string) => Promise<string | null>
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        
        const promises = filePaths.map(async (filePath) => {
            try {
                const content = await this.readOrFetch(filePath, readRemote);
                if (content !== null) {
                    return { path: filePath, content };
                }
            } catch (error) {
                console.warn(`[StateMachine] Error reading file ${filePath}:`, error);
            }
            return null;
        });

        const batchResults = await Promise.all(promises);
        
        for (const result of batchResults) {
            if (result) {
                results[result.path] = result.content;
            }
        }

        return results;
    }

    /**
     * Track multiple binary files at once - compatibility method
     */
    async trackBinaryFilesBatch(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            if (!this.binaryFileStates.has(filePath)) {
                await this.saveBinaryToLocal(filePath, new Uint8Array(0));
                this.setBinaryState(filePath, 'clean');
            }
        }
    }

    /**
     * Read or fetch binary file - compatibility method
     */
    async readOrFetchBinaryFile(
        filePath: string,
        readRemote: (path: string) => Promise<Uint8Array | null>
    ): Promise<Uint8Array | null> {
        const stateData = this.binaryFileStates.get(filePath);
        
        if (stateData && stateData.content.length > 0) {
            return stateData.content;
        }

        try {
            const content = await readRemote(filePath);
            if (content === null) {
                return null;
            }
            
            await this.saveBinaryToLocal(filePath, content);
            this.setBinaryState(filePath, 'clean');
            return content;
        } catch (error) {
            console.error(`[StateMachine] Error reading binary file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Update cache directly - compatibility method (use with caution)
     */
    async updateCache(filePath: string, content: string): Promise<void> {
        console.warn(`[StateMachine] Direct cache update for ${filePath} - bypasses state machine`);
        await this.saveToLocal(filePath, content);
        this.setState(filePath, 'clean');
    }

    /**
     * List binary files in directory - compatibility method
     */
    listBinaryFiles(dir: string): string[] {
        return Array.from(this.binaryFileStates.keys()).filter(filePath => 
            filePath.startsWith(dir)
        );
    }
} 