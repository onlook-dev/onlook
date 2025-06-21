import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models/actions';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { COMPRESSION_IMAGE_PRESETS, DefaultSettings } from '@onlook/constants';
import {
    convertToBase64,
    getBaseName,
    getDirName,
    getMimeType,
    isImageFile,
} from '@onlook/utility/src/file';
import { api } from '@/trpc/client';

export class ImageManager {
    private images: ImageContentData[] = [];
    private _isScanning = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        reaction(
            () => this.editorEngine.sandbox.isIndexingFiles,
            (isIndexingFiles) => {
                if (!isIndexingFiles) {
                    this.scanImages();
                }
            }
        );
    }

    async upload(file: File): Promise<void> {
        try {
            const path = `${DefaultSettings.IMAGE_FOLDER}/${file.name}`;
            // Convert file to base64 for tRPC transmission
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = btoa(
                Array.from(new Uint8Array(arrayBuffer))
                    .map((byte: number) => String.fromCharCode(byte))
                    .join('')
            );

            const compressionResult = await api.image.compress.mutate({
                imageData: base64Data,
                options: COMPRESSION_IMAGE_PRESETS.highQuality,
            });

            let finalBuffer: Uint8Array;

            if (compressionResult.success && compressionResult.bufferData) {
                // Convert base64 buffer data back to Uint8Array
                const compressedBuffer = atob(compressionResult.bufferData);
                finalBuffer = new Uint8Array(compressedBuffer.length);
                for (let i = 0; i < compressedBuffer.length; i++) {
                    finalBuffer[i] = compressedBuffer.charCodeAt(i);
                }
            } else {
                // Fall back to original if compression failed
                console.warn('Image compression failed, using original:', compressionResult.error);
                finalBuffer = new Uint8Array(arrayBuffer);
            }

            await this.editorEngine.sandbox.writeBinaryFile(path, finalBuffer);
            this.scanImages();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(originPath: string): Promise<void> {
        try {
            await this.editorEngine.sandbox.delete(originPath);
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async rename(originPath: string, newName: string): Promise<void> {
        try {
            const basePath = getDirName(originPath);
            const newPath = `${basePath}/${newName}`;
            await this.editorEngine.sandbox.copy(originPath, newPath);
            await this.editorEngine.sandbox.delete(originPath);
            this.scanImages();
        } catch (error) {
            console.error('Error renaming image:', error);
            throw error;
        }
    }

    async insert(base64Image: string, mimeType: string): Promise<InsertImageAction | undefined> {
        return;
        // const targets = this.getTargets();
        // if (!targets || targets.length === 0) {
        //     return;
        // }

        // try {
        //     const response = await fetch(base64Image);
        //     const blob = await response.blob();
        //     const file = new File([blob], 'image', { type: mimeType });
        //     const compressedBase64 = await compressImage(file);
        //     if (!compressedBase64) {
        //         console.error('Failed to compress image');
        //         return;
        //     }
        //     base64Image = compressedBase64;
        // } catch (error) {
        //     console.error('Error compressing image:', error);
        //     return;
        // }

        // const fileName = `${nanoid(4)}.${mime.getExtension(mimeType)}`;
        // const action: InsertImageAction = {
        //     type: 'insert-image',
        //     targets: targets,
        //     image: {
        //         content: base64Image,
        //         fileName: fileName,
        //         mimeType: mimeType,
        //     },
        // };

        // this.editorEngine.action.run(action);
        // setTimeout(() => {
        //     this.scanImages();
        // }, 2000);
        // sendAnalytics('image insert', { mimeType });
    }

    get assets() {
        return this.images;
    }

    get isScanning() {
        return this._isScanning;
    }

    remove() {
        // this.editorEngine.style.update('backgroundImage', 'none');
        // sendAnalytics('image-removed');
    }

    getTargets() {
        const selected = this.editorEngine.elements.selected;

        if (!selected || selected.length === 0) {
            console.error('No elements selected');
            return;
        }

        const targets: ActionTarget[] = selected.map((element) => ({
            frameId: element.frameId,
            domId: element.domId,
            oid: element.oid,
        }));

        return targets;
    }

    async scanImages() {
        if (this._isScanning) {
            return;
        }

        this._isScanning = true;

        try {
            const files = await this.editorEngine.sandbox.listBinaryFiles(
                DefaultSettings.IMAGE_FOLDER,
            );

            if (files.length === 0) {
                this.images = [];
                return;
            }

            const imageFiles = files.filter((filePath: string) => isImageFile(filePath));

            if (imageFiles.length === 0) {
                return;
            }
            
            const imagePromises = imageFiles.map(async (filePath: string) => {
                try {
                    // Read the binary file
                    const binaryData = await this.editorEngine.sandbox.readBinaryFile(filePath);
                    if (!binaryData) {
                        console.warn(`Failed to read binary data for ${filePath}`);
                        return null;
                    }

                    // Determine MIME type based on file extension
                    const mimeType = getMimeType(filePath);

                    // Convert binary data to base64
                    const base64Data = convertToBase64(binaryData);
                    const content = `data:${mimeType};base64,${base64Data}`;

                    return {
                        originPath: filePath,
                        content,
                        fileName: getBaseName(filePath),
                        mimeType,
                    } as ImageContentData;
                } catch (error) {
                    console.error(`Error processing image ${filePath}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(imagePromises);
            
            this.images = results.filter((result): result is ImageContentData => result !== null)
            
        } catch (error) {
            console.error('Error scanning images:', error);
            this.images = [];
        } finally {
            this._isScanning = false;
        } 
    }

    clear() {
        this.images = [];
    }
}
