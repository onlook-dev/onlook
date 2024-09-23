import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export class ImageStorage {
    private readonly IMAGES_FOLDER: string;

    constructor() {
        const APP_PATH = app.getPath('userData');
        this.IMAGES_FOLDER = join(APP_PATH, 'images');
        this.ensureImagesFolderExists();
    }

    private ensureImagesFolderExists() {
        if (!existsSync(this.IMAGES_FOLDER)) {
            mkdirSync(this.IMAGES_FOLDER, { recursive: true });
        }
    }

    saveImage(fileName: string, imageData: Buffer): void {
        const filePath = join(this.IMAGES_FOLDER, fileName);
        try {
            writeFileSync(filePath, imageData);
            console.log(`Image saved successfully: ${filePath}`);
        } catch (error) {
            console.error(`Error saving image ${fileName}:`, error);
        }
    }

    readImage(fileName: string): Buffer | null {
        const filePath = join(this.IMAGES_FOLDER, fileName);
        try {
            if (existsSync(filePath)) {
                return readFileSync(filePath);
            }
            console.log(`Image not found: ${filePath}`);
            return null;
        } catch (error) {
            console.error(`Error reading image ${fileName}:`, error);
            return null;
        }
    }

    deleteImage(fileName: string): boolean {
        const filePath = join(this.IMAGES_FOLDER, fileName);
        try {
            if (existsSync(filePath)) {
                unlinkSync(filePath);
                console.log(`Image deleted successfully: ${filePath}`);
                return true;
            }
            console.log(`Image not found: ${filePath}`);
            return false;
        } catch (error) {
            console.error(`Error deleting image ${fileName}:`, error);
            return false;
        }
    }

    listImages(): string[] {
        try {
            return readdirSync(this.IMAGES_FOLDER);
        } catch (error) {
            console.error('Error listing images:', error);
            return [];
        }
    }
}
