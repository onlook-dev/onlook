import { app, safeStorage } from 'electron';

export abstract class BasePersistentStorage<T> {
    protected readonly APP_PATH: string;

    constructor(
        protected readonly fileName: string,
        protected readonly encrypted = false,
    ) {
        this.APP_PATH = app.getPath('userData');
    }

    protected readEncryptedData(data: string): T | null {
        const encryptedBuffer = Buffer.from(data, 'base64');
        const decryptedData = safeStorage.decryptString(encryptedBuffer);
        return decryptedData ? (JSON.parse(decryptedData) as T) : null;
    }

    protected writeEncryptedData(value: T): string {
        const data = JSON.stringify(value);
        const encryptedData = safeStorage.encryptString(data);
        return encryptedData.toString('base64');
    }

    protected readUnencryptedData(data: string): T | null {
        return data ? (JSON.parse(data) as T) : null;
    }

    protected writeUnencryptedData(value: T): string {
        return JSON.stringify(value);
    }
}
