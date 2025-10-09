import { type ActionTarget, type ImageContentData } from '@onlook/models';
import { convertToBase64DataUrl, getBaseName, getMimeType, isImageFile, sanitizeFilename, stripImageFolderPrefix } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import path from 'path';
import type { EditorEngine } from '../engine';

export class ImageManager {
    private _imagePaths: string[] = [];
    private _isSelectingImage = false;
    private _selectedImage: ImageContentData | null = null;
    private _previewImage: ImageContentData | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    init() { }

    get imagePaths() {
        return this._imagePaths;
    }

    get isSelectingImage() {
        return this._isSelectingImage;
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
            // Sanitize filename from user upload
            const sanitizedName = sanitizeFilename(file.name);
            const filePath = path.join(destinationFolder, sanitizedName);
            const uint8Array = new Uint8Array(await file.arrayBuffer());
            await this.editorEngine.activeSandbox.writeFile(filePath, uint8Array);
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    search(name: string) {
        return this.imagePaths.find((img) => name.includes(img));
    }


    getTargets() {
        const selected = this.editorEngine.elements.selected;

        if (!selected || selected.length === 0) {
            console.error('No elements selected');
            return;
        }

        const targets: ActionTarget[] = selected.map((element) => ({
            frameId: element.frameId,
            branchId: element.branchId,
            domId: element.domId,
            oid: element.oid,
        }));

        return targets;
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

            // Determine MIME type based on file extension
            const mimeType = getMimeType(imagePath);

            // Read the file using the sandbox
            const file = await this.editorEngine.activeSandbox.readFile(imagePath);
            let content: string;

            // Handle SVG files more efficiently by reading as text if available
            if (mimeType === 'image/svg+xml' && typeof file === 'string') {
                // For SVG files read as text, create a data URL directly
                content = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file)}`;
            } else if (file instanceof Uint8Array) {
                // For binary files, convert to base64
                content = convertToBase64DataUrl(file, mimeType);
            } else {
                console.warn(`Unexpected file type or content format for ${imagePath}`);
                return null;
            }

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

    clear() {
        this._imagePaths = [];
        this._selectedImage = null;
        this._previewImage = null;
        this._isSelectingImage = false;
    }

}
