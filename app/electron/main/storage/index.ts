import { UserMetadata } from '@supabase/supabase-js';
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AppState, AuthTokens, ProjectsCache, UserSettings } from '/common/models/settings';

export enum StorageType {
    USER_SETTINGS = 'user-settings',
    APP_STATE = 'app-state',
    USER_METADATA = 'user-metadata',
    AUTH_TOKENS = 'auth-tokens',
    PROJECTS = 'projects',
}

export class PersistentStorage<T> {
    public readonly FILE_PATH: string;

    static readonly APP_STATE = new PersistentStorage<AppState>(StorageType.APP_STATE);
    static readonly PROJECTS = new PersistentStorage<ProjectsCache>(StorageType.PROJECTS);
    static readonly USER_SETTINGS = new PersistentStorage<UserSettings>(StorageType.USER_SETTINGS);
    static readonly USER_METADATA = new PersistentStorage<UserMetadata>(StorageType.USER_METADATA);
    static readonly AUTH_TOKENS = new PersistentStorage<AuthTokens>(StorageType.AUTH_TOKENS, true);

    private constructor(
        public readonly fileName: string,
        public readonly encrypted = false,
    ) {
        const APP_PATH = app.getPath('userData');
        this.FILE_PATH = `${APP_PATH}/${fileName}.json`;
    }

    read(): T | null {
        try {
            return this.encrypted ? this.readEncrypted() : this.readUnencrypted();
        } catch (e) {
            console.error(`Error reading file ${this.FILE_PATH}: `, e);
            return null;
        }
    }

    write(value: T) {
        try {
            this.encrypted ? this.writeEncrypted(value) : this.writeUnencrypted(value);
        } catch (e) {
            console.error(`Error writing file ${this.FILE_PATH}: `, e);
            return null;
        }
    }

    update(value: T) {
        try {
            this.encrypted ? this.updateEncrypted(value) : this.updateUnencrypted(value);
        } catch (e) {
            console.error(`Error updating file ${this.FILE_PATH}: `, e);
            return null;
        }
    }

    clear() {
        try {
            writeFileSync(this.FILE_PATH, '');
        } catch (e) {
            console.error(`Error clearing file ${this.FILE_PATH}: `, e);
            return null;
        }
    }

    private readUnencrypted(): T | null {
        if (!existsSync(this.FILE_PATH)) {
            return null;
        }
        const data = readFileSync(this.FILE_PATH, 'utf8');
        return data ? (JSON.parse(data) as T) : null;
    }

    private writeUnencrypted(value: T) {
        const data = JSON.stringify(value);
        writeFileSync(this.FILE_PATH, data);
    }

    private updateUnencrypted(value: T) {
        const existingValue = this.readUnencrypted();
        this.writeUnencrypted({ ...(existingValue ?? {}), ...value });
    }

    private readEncrypted(): T | null {
        if (!existsSync(this.FILE_PATH)) {
            return null;
        }
        const base64EncryptedData = readFileSync(this.FILE_PATH, 'utf8');
        const encryptedBuffer = Buffer.from(base64EncryptedData, 'base64');
        const data = safeStorage.decryptString(encryptedBuffer);
        return data ? (JSON.parse(data) as T) : null;
    }

    private writeEncrypted(value: T) {
        const base64EncryptedData = this.encryptToBase64(value);
        writeFileSync(this.FILE_PATH, base64EncryptedData);
    }

    private updateEncrypted(value: T) {
        const existingValue = this.readEncrypted();
        if (!existingValue) {
            this.writeEncrypted(value);
            return;
        }
        this.writeEncrypted({ ...(existingValue ?? {}), ...value });
    }

    private encryptToBase64(value: T): string {
        const data = JSON.stringify(value);
        const encryptedData = safeStorage.encryptString(data);
        const base64EncryptedData = encryptedData.toString('base64');
        return base64EncryptedData;
    }
}
