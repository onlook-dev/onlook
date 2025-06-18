import type { ProjectManager } from '@/components/store/project/manager';
import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models/actions';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { DefaultSettings } from '@onlook/constants';
import { convertToBase64, getBaseName, getMimeType, isImageFile } from '@onlook/utility/src/file';
export class ImageManager {
    private images: ImageContentData[] = [];

    constructor(
        private editorEngine: EditorEngine,
    ) {
        this.scanImages();
        makeAutoObservable(this);
    }

    async upload(file: File): Promise<void> {
        try {            
            const buffer = await file.arrayBuffer();
            const path = `${DefaultSettings.IMAGE_FOLDER}/${file.name}`;

         await this.editorEngine.sandbox.writeBinaryFile(
                path,
                new Uint8Array(buffer),
            );
            this.scanImages();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(imageName: string): Promise<void> {
        try {
            const path = `${DefaultSettings.IMAGE_FOLDER}/${imageName}`;
            await this.editorEngine.sandbox.delete(path);
            this.scanImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async rename(oldName: string, newName: string): Promise<void> {
        try {
            const oldPath = `${DefaultSettings.IMAGE_FOLDER}/${oldName}`;
            const newPath = `${DefaultSettings.IMAGE_FOLDER}/${newName}`;
            await this.editorEngine.sandbox.copy(oldPath, newPath);
            await this.editorEngine.sandbox.delete(oldPath);
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
        try {
            const files = await this.editorEngine.sandbox.listBinaryFiles(DefaultSettings.IMAGE_FOLDER);

            if (!files) {
                this.images = [];
                return;
            }

            const imageFiles = files.filter((filePath: string) => isImageFile(filePath));

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
            this.images = results.filter((result): result is ImageContentData => result !== null);
        } catch (error) {
            console.error('Error scanning images:', error);
            this.images = [];
        }
    }

    clear() {
        this.images = [];
    }
}