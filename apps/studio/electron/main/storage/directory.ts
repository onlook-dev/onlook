import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { BasePersistentStorage } from './base';

interface StorageIndex<K extends string | number> {
    collections: Record<string, K[]>;
}

export class DirectoryPersistentStorage<
    T extends { id: K },
    K extends string | number = string,
> extends BasePersistentStorage<T> {
    public readonly DIR_PATH: string;
    private readonly INDEX_PATH: string;

    constructor(
        fileName: string,
        encrypted = false,
        private readonly getCollectionKey?: (item: T) => string,
    ) {
        super(fileName, encrypted);
        this.DIR_PATH = path.join(this.APP_PATH, fileName);
        this.INDEX_PATH = path.join(this.DIR_PATH, 'index.json');

        if (!existsSync(this.DIR_PATH)) {
            mkdirSync(this.DIR_PATH, { recursive: true });
        }
    }

    readItem(id: K): T | null {
        try {
            const filePath = this.getItemPath(id);
            if (!existsSync(filePath)) {
                return null;
            }

            const data = readFileSync(filePath, 'utf8');
            return this.encrypted ? this.readEncryptedData(data) : this.readUnencryptedData(data);
        } catch (e) {
            console.error(`Error reading item ${id}: `, e);
            return null;
        }
    }

    writeItem(item: T) {
        try {
            const filePath = this.getItemPath(item.id);
            const data = this.encrypted
                ? this.writeEncryptedData(item)
                : this.writeUnencryptedData(item);

            writeFileSync(filePath, data);

            if (this.getCollectionKey) {
                this.updateIndex(item);
            }
        } catch (e) {
            console.error(`Error writing item ${item.id}: `, e);
        }
    }

    deleteItem(id: K, collectionKey?: string) {
        try {
            const filePath = this.getItemPath(id);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
                if (collectionKey) {
                    this.removeFromIndex(id, collectionKey);
                }
            }
        } catch (e) {
            console.error(`Error deleting item ${id}: `, e);
        }
    }

    getCollection(collectionKey: string): T[] {
        const index = this.readIndex();
        const itemIds = index.collections[collectionKey] || [];
        return itemIds.map((id) => this.readItem(id)).filter((item): item is T => item !== null);
    }

    getAllItems(): T[] {
        try {
            const files = readdirSync(this.DIR_PATH).filter(
                (file) => file.endsWith('.json') && file !== 'index.json',
            );

            return files
                .map((file) => {
                    const id = path.parse(file).name as K;
                    return this.readItem(id);
                })
                .filter((item): item is T => item !== null);
        } catch (e) {
            console.error('Error reading all items: ', e);
            return [];
        }
    }

    private getItemPath(id: K): string {
        return path.join(this.DIR_PATH, `${id}.json`);
    }

    private readIndex(): StorageIndex<K> {
        if (!existsSync(this.INDEX_PATH)) {
            return { collections: {} };
        }
        try {
            const data = readFileSync(this.INDEX_PATH, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Error reading index: ', e);
            return { collections: {} };
        }
    }

    private writeIndex(index: StorageIndex<K>) {
        writeFileSync(this.INDEX_PATH, JSON.stringify(index));
    }

    private updateIndex(item: T) {
        if (!this.getCollectionKey) {
            return;
        }

        const collectionKey = this.getCollectionKey(item);
        const index = this.readIndex();

        if (!index.collections[collectionKey]) {
            index.collections[collectionKey] = [];
        }

        if (!index.collections[collectionKey].includes(item.id)) {
            index.collections[collectionKey].push(item.id);
            this.writeIndex(index);
        }
    }

    private removeFromIndex(id: K, collectionKey: string) {
        const index = this.readIndex();

        if (index.collections[collectionKey]) {
            index.collections[collectionKey] = index.collections[collectionKey].filter(
                (itemId) => itemId !== id,
            );

            if (index.collections[collectionKey].length === 0) {
                delete index.collections[collectionKey];
            }

            this.writeIndex(index);
        }
    }
}
