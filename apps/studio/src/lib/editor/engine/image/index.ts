import { sendAnalytics, compressImage, invokeMainChannel } from '@/lib/utils';
import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models/actions';
import { getExtension } from 'mime-lite';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';
import type { ProjectsManager } from '@/lib/projects';
import { makeAutoObservable } from 'mobx';
import { MainChannels } from '@onlook/models/constants';

export class ImageManager {
    private images: ImageContentData[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.scanImages();
    }

    async upload(file: File): Promise<void> {
        const SUPPORTED_MIME_TYPES = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
        ];

        try {
            if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
                throw new Error('Unsupported image type');
            }

            const compressedImage = await compressImage(file);

            // If compression failed, fall back to original file
            const base64Image =
                compressedImage ||
                (await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));
            const projectFolder = this.projectsManager.project?.folderPath;

            if (!projectFolder) {
                console.error('Failed to write image, projectFolder not found');
                return;
            }

            await invokeMainChannel<string, string>(
                MainChannels.SAVE_IMAGE_TO_PROJECT,
                projectFolder,
                base64Image,
                file.name,
            );

            this.scanImages();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(imageName: string): Promise<void> {
        try {
            const projectFolder = this.projectsManager.project?.folderPath;
            if (!projectFolder) {
                console.error('Failed to delete image, projectFolder not found');
                return;
            }
            await invokeMainChannel<string, string>(
                MainChannels.DELETE_IMAGE_FROM_PROJECT,
                projectFolder,
                imageName,
            );
            this.scanImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async insert(base64Image: string, mimeType: string): Promise<InsertImageAction | undefined> {
        const targets = this.getTargets();
        if (!targets || targets.length === 0) {
            return;
        }

        try {
            const response = await fetch(base64Image);
            const blob = await response.blob();
            const file = new File([blob], 'image', { type: mimeType });
            const compressedBase64 = await compressImage(file);
            if (!compressedBase64) {
                console.error('Failed to compress image');
                return;
            }
            base64Image = compressedBase64;
        } catch (error) {
            console.error('Error compressing image:', error);
            return;
        }

        const fileName = `${nanoid(4)}.${getExtension(mimeType)}`;
        const action: InsertImageAction = {
            type: 'insert-image',
            targets: targets,
            image: {
                content: base64Image,
                fileName: fileName,
                mimeType: mimeType,
            },
        };

        this.editorEngine.action.run(action);
        sendAnalytics('image-inserted', { mimeType });
    }

    get assets() {
        return this.images;
    }

    remove() {
        this.editorEngine.style.update('backgroundImage', 'none');
        sendAnalytics('image-removed');
    }

    getTargets() {
        const selected = this.editorEngine.elements.selected;

        if (!selected || selected.length === 0) {
            console.error('No elements selected');
            return;
        }

        const targets: ActionTarget[] = selected.map((element) => ({
            webviewId: element.webviewId,
            domId: element.domId,
            oid: element.oid,
        }));

        return targets;
    }

    async scanImages() {
        const projectRoot = this.projectsManager.project?.folderPath;

        if (!projectRoot) {
            console.warn('No project root found');
            return;
        }
        const images = await invokeMainChannel<string, ImageContentData[]>(
            MainChannels.SCAN_IMAGES_IN_PROJECT,
            projectRoot,
        );
        if (images?.length) {
            this.images = images;
        } else {
            this.images = [];
        }
    }

    dispose() {
        // Clear references
        this.editorEngine = null as any;
        this.projectsManager = null as any;

        // Clean up images
        this.images = [];
    }
}
