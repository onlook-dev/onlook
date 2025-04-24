import { subscribe, type AsyncSubscription } from '@parcel/watcher';
import { MainChannels } from '@onlook/models/constants';
import * as pathModule from 'path';
import fs from 'fs';
import { mainWindow } from '../index';
import { readFile } from './files';
import { debounce } from 'lodash';

export class FileWatcher {
    private subscriptions: Map<string, AsyncSubscription> = new Map();
    private selfModified: Set<string> = new Set();
    private fileContents: Map<string, string> = new Map();

    async watchFile(filePath: string) {
        if (!fs.existsSync(filePath)) {
            console.error(`File does not exist: ${filePath}`);
            return false;
        }

        // If already watching this file, no need to create a new subscription
        if (this.subscriptions.has(filePath)) {
            return true;
        }

        try {
            // Caches the initial file content
            const initialContent = await readFile(filePath);
            if (initialContent !== null) {
                this.fileContents.set(filePath, initialContent);
            }

            // Watch the directory containing the file
            const dirPath = pathModule.dirname(filePath);

            const normalizedPath = pathModule.normalize(filePath);

            const subscription = await subscribe(
                dirPath,
                (err, events) => {
                    if (err) {
                        console.error(`File watcher error: ${err}`);
                        return;
                    }

                    if (events.length > 0) {
                        for (const event of events) {
                            const eventPath = pathModule.normalize(event.path);

                            // Skip if this change was made by our application
                            if (this.selfModified.has(eventPath)) {
                                this.selfModified.delete(eventPath);
                                continue;
                            }

                            // If the watched file was updated
                            if (
                                eventPath === normalizedPath &&
                                (event.type === 'update' || event.type === 'create')
                            ) {
                                this.debouncedNotifyFileChanged(filePath);
                            }
                        }
                    }
                },
                {
                    ignore: ['**/node_modules/**', '**/.git/**'],
                },
            );

            this.subscriptions.set(filePath, subscription);
            return true;
        } catch (error) {
            console.error('Error setting up file watcher:', error);
            return false;
        }
    }

    // This prevent multiple notifications for a single save event
    private debouncedNotifyFileChanged = debounce(async (filePath: string) => {
        await this.notifyFileChanged(filePath);
    }, 300);

    private async notifyFileChanged(filePath: string) {
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`Cannot read changed file that no longer exists: ${filePath}`);
                return;
            }

            // Read the new content of the file
            const content = await readFile(filePath);
            if (content === null) {
                console.warn(`Failed to read content for file: ${filePath}`);
                return;
            }

            // Compare with cached content to see if it actually changed
            const cachedContent = this.fileContents.get(filePath);
            if (cachedContent === content) {
                return;
            }

            // Update cache
            this.fileContents.set(filePath, content);

            // Notifies the UI about the file change
            if (mainWindow?.webContents && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(MainChannels.FILE_CHANGED, {
                    path: filePath,
                    content,
                });
            }
        } catch (error) {
            console.error('Error reading changed file:', error);
        }
    }

    markFileAsModified(filePath: string) {
        const normalizedPath = pathModule.normalize(filePath);
        this.selfModified.add(normalizedPath);

        // When we mark a file as modified, we also update our content cache
        // to avoid unnecessary notifications
        setTimeout(async () => {
            try {
                if (fs.existsSync(filePath)) {
                    const content = await readFile(filePath);
                    if (content !== null) {
                        this.fileContents.set(filePath, content);
                    }
                }
            } catch (error) {
                console.error('Error updating cached content after modification:', error);
            }
        }, 500);
    }

    unwatchFile(filePath: string) {
        const subscription = this.subscriptions.get(filePath);
        if (subscription) {
            subscription.unsubscribe().catch((err) => {
                console.error('Error unsubscribing from file watcher:', err);
            });
            this.subscriptions.delete(filePath);
            this.fileContents.delete(filePath);
        }
    }

    async clearAllSubscriptions() {
        for (const [filePath, subscription] of this.subscriptions.entries()) {
            try {
                await subscription.unsubscribe();
            } catch (error) {
                console.error(`Error unsubscribing from watcher for ${filePath}:`, error);
            }
        }
        this.subscriptions.clear();
        this.fileContents.clear();
    }
}

export const fileWatcher = new FileWatcher();
