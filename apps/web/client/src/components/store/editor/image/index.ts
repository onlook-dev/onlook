import { DefaultSettings } from '@onlook/constants';
import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models';
import { convertToBase64, generateNewFolderPath, getBaseName, getMimeType, isImageFile, stripImageFolderPrefix } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';

export class ImageManager {
    private _imagePaths: string[] = [];
    private _isScanning = false;
    private _isSelectingImage = false;
    private _selectedImage: ImageContentData | null = null;
    private _previewImage: ImageContentData | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        reaction(
            () => this.editorEngine.sandbox.isIndexing,
            async (isIndexingFiles) => {
                if (!isIndexingFiles) {
                    await this.scanImages();
                }
            },
        );
    }

    get imagePaths() {
        return this._imagePaths;
    }

    get isSelectingImage() {
        return this._isSelectingImage;
    }

    get isScanning() {
        return this._isScanning;
    }

    get selectedImage() {
        return this._selectedImage;
    }

    get previewImage() {
        return this._previewImage;
    }

    setPreviewImage(image: ImageContentData | null) {
        try {
            this._previewImage = image;
            const selected = this.editorEngine.elements.selected;

            if (!selected || selected.length === 0) {
                console.warn('No elements selected to apply background image');
                return;
            }

            if (image?.originPath) {
                const url = stripImageFolderPrefix(image.originPath);
                this.editorEngine.style.updateMultiple({
                    backgroundImage: `url('/${url}')`,
                });
            } else if (this.selectedImage?.originPath) {
                const url = stripImageFolderPrefix(this.selectedImage.originPath);
                this.editorEngine.style.updateMultiple({
                    backgroundImage: `url('/${url}')`,
                });
            } else {
                this.editorEngine.style.updateMultiple({
                    backgroundImage: 'none',
                });
            }
        } catch (error) {
            console.error('Failed to set preview image:', error);
        }
    }

    setSelectedImage(image: ImageContentData | null) {
        try {
            this._selectedImage = image;

            const selected = this.editorEngine.elements.selected;

            if (!selected || selected.length === 0) {
                console.warn('No elements selected to apply background image');
                return;
            }

            if (!image?.originPath) {
                console.warn('Image origin path is missing');
                return;
            }

            try {
                const url = stripImageFolderPrefix(image.originPath);

                if (!url) {
                    throw new Error('Failed to generate relative path');
                }

                const styles = {
                    backgroundImage: `url('/${url}')`,
                };

                this.editorEngine.style.updateMultiple(styles);
            } catch (urlError) {
                console.error('Failed to process image path:', urlError);
                throw new Error('Invalid image path');
            }
        } catch (error) {
            console.error('Failed to apply background image:', error);
        }
    }

    setIsSelectingImage(isSelectingImage: boolean) {
        this._isSelectingImage = isSelectingImage;
    }

    async upload(file: File, destinationFolder: string): Promise<void> {
        try {
            const path = `${destinationFolder}/${file.name}`;
            const uint8Array = new Uint8Array(await file.arrayBuffer());
            await this.editorEngine.sandbox.writeBinaryFile(path, uint8Array);
            await this.scanImages();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(originPath: string): Promise<void> {
        try {
            await this.editorEngine.sandbox.delete(originPath);
            await this.scanImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async rename(originPath: string, newName: string): Promise<void> {
        try {
            const newPath = generateNewFolderPath(originPath, newName, 'rename');
            await this.editorEngine.sandbox.rename(originPath, newPath);
            await this.scanImages();
        } catch (error) {
            console.error('Error renaming image:', error);
            throw error;
        }
    }

    async paste(base64Image: string, mimeType: string): Promise<InsertImageAction | undefined> {
        console.log('paste image');
        return;
    }

    search(name: string) {
        return this.imagePaths.find((img) => name.includes(img));
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
            const files = await this.editorEngine.sandbox.listFilesRecursively(
                DefaultSettings.IMAGE_FOLDER,
            );
            if (!files) {
                console.error('No files found in image folder');
                return;
            }
            if (files.length === 0) {
                this._imagePaths = [];
                return;
            }
            this._imagePaths = files.filter((file: string) => isImageFile(file));
        } catch (error) {
            console.error('Error scanning images:', error);
            this._imagePaths = [];
        } finally {
            this._isScanning = false;
        }
    }

    clear() {
        this._imagePaths = [];
    }

    /**
     * Read content of a single image file
     */
    async readImageContent(imagePath: string): Promise<ImageContentData | null> {
        try {
            // Validate if the file is an image
            if (!isImageFile(imagePath)) {
                console.warn(`File ${imagePath} is not a valid image file`);
                return null;
            }

            // Read the binary file using the sandbox
            const file = await this.editorEngine.sandbox.readFile(imagePath);
            if (!file || file.type === 'text' || !file.content) {
                console.warn(`Failed to read binary data for ${imagePath}`);
                return null;
            }

            // Determine MIME type based on file extension
            const mimeType = getMimeType(imagePath);

            // Convert binary data to base64
            const base64Data = convertToBase64(file.content);
            const content = `data:${mimeType};base64,${base64Data}`;

            return {
                originPath: imagePath,
                content,
                fileName: getBaseName(imagePath),
                mimeType,
            } as ImageContentData;
        } catch (error) {
            console.error(`Error reading image content for ${imagePath}:`, error);
            return null;
        }
    }

    /**
     * Read content of multiple image files in parallel
     */
    async readImagesContent(imagePaths: string[]): Promise<ImageContentData[]> {
        if (!imagePaths.length) {
            return [];
        }

        try {
            // Process all images in parallel
            const imagePromises = imagePaths.map((path) => this.readImageContent(path));
            const results = await Promise.all(imagePromises);

            // Filter out null results
            const validImages = results.filter((result) => !!result);
            return validImages;
        } catch (error) {
            console.error('Error reading images content:', error);
            return [];
        }
    }
}
