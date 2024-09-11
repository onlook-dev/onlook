import { UserMetadata } from '@supabase/supabase-js';
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AuthTokens, ProjectSettings, UserSettings } from '/common/models/settings';

export class PersistenStorage<T> {
    public readonly FILE_PATH: string;
    static readonly USER_SETTINGS = new PersistenStorage<UserSettings>('user-settings');
    static readonly PROJECT_SETTINGS = new PersistenStorage<ProjectSettings>('project-settings');
    static readonly AUTH_TOKENS = new PersistenStorage<AuthTokens>('auth-tokens');
    static readonly USER_METADATA = new PersistenStorage<UserMetadata>('user-metadata');

    private constructor(public readonly fileName: string) {
        const APP_PATH = app.getPath('userData');
        this.FILE_PATH = `${APP_PATH}/${fileName}.json`;
    }

    read(): T {
        if (!existsSync(this.FILE_PATH)) {
            return {} as T;
        }

        const content = readFileSync(this.FILE_PATH, 'utf8');
        return JSON.parse(content || '') as T;
    }

    write(value: T) {
        const data = JSON.stringify(value);
        writeFileSync(this.FILE_PATH, data);
    }

    update(value: T) {
        const existingValue = this.read();
        this.write({ ...existingValue, ...value });
    }

    writeEncrypted(value: T) {
        const data = JSON.stringify(value);
        const encryptedData = safeStorage.encryptString(data);
        writeFileSync(this.FILE_PATH, encryptedData);
    }

    readEncrypted(): T {
        if (!existsSync(this.FILE_PATH)) {
            return {} as T;
        }

        const encryptedBuffer = readFileSync(this.FILE_PATH);
        const data = safeStorage.decryptString(encryptedBuffer);
        return JSON.parse(data || '');
    }

    updateEncrypted(value: T) {
        const existingValue = this.readEncrypted();
        this.writeEncrypted({ ...existingValue, ...value });
    }
}
