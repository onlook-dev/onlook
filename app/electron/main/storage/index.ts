import { UserMetadata } from '@supabase/supabase-js';
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AuthTokens, ProjectSettings, UserSettings } from '/common/models/settings';

export class PersistenStorage<T> {
    public readonly FILE_PATH: string;
    static readonly USER_SETTINGS = new PersistenStorage<UserSettings>('user-settings');
    static readonly PROJECT_SETTINGS = new PersistenStorage<ProjectSettings>('project-settings');
    static readonly USER_METADATA = new PersistenStorage<UserMetadata>('user-metadata');
    static readonly AUTH_TOKENS = new PersistenStorage<AuthTokens>('auth-tokens', true);

    private constructor(
        public readonly fileName: string,
        public readonly encrypted = false,
    ) {
        const APP_PATH = app.getPath('userData');
        this.FILE_PATH = `${APP_PATH}/${fileName}.json`;
    }

    read(): T {
        try {
            return this.encrypted ? this.readEncrypted() : this.readUnencrypted();
        } catch (e) {
            console.error(`Error reading file ${this.FILE_PATH}: `, e);
            return {} as T;
        }
    }

    write(value: T) {
        this.encrypted ? this.writeEncrypted(value) : this.writeUnencrypted(value);
    }

    update(value: T) {
        this.encrypted ? this.updateEncrypted(value) : this.updateUnencrypted(value);
    }

    clear() {
        writeFileSync(this.FILE_PATH, '');
    }

    private readUnencrypted(): T {
        if (!existsSync(this.FILE_PATH)) {
            return {} as T;
        }

        const content = readFileSync(this.FILE_PATH, 'utf8');
        return JSON.parse(content || '') as T;
    }

    private writeUnencrypted(value: T) {
        const data = JSON.stringify(value);
        writeFileSync(this.FILE_PATH, data);
    }

    private updateUnencrypted(value: T) {
        const existingValue = this.readUnencrypted();
        this.writeUnencrypted({ ...existingValue, ...value });
    }

    private readEncrypted(): T {
        if (!existsSync(this.FILE_PATH)) {
            return {} as T;
        }
        const base64EncryptedData = readFileSync(this.FILE_PATH, 'utf8');
        const encryptedBuffer = Buffer.from(base64EncryptedData, 'base64');
        const data = safeStorage.decryptString(encryptedBuffer);
        return JSON.parse(data || '');
    }

    private writeEncrypted(value: T) {
        const data = JSON.stringify(value);
        const encryptedData = safeStorage.encryptString(data);
        const base64EncryptedData = encryptedData.toString('base64');
        writeFileSync(this.FILE_PATH, base64EncryptedData);
    }

    private updateEncrypted(value: T) {
        const existingValue = this.readEncrypted();
        this.writeEncrypted({ ...existingValue, ...value });
    }
}
