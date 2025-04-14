import type { ProjectsManager } from '@/lib/projects';
import { compressImage, invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models/actions';
import { MainChannels } from '@onlook/models/constants';
import mime from 'mime-lite';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';

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
        try {
            const projectFolder = this.projectsManager.project?.folderPath;
            if (!projectFolder) {
                throw new Error('Project folder not found');
            }

            const buffer = await file.arrayBuffer();
            const base64String = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
            );

            await invokeMainChannel(MainChannels.SAVE_IMAGE_TO_PROJECT, {
                projectFolder,
                content: base64String,
                fileName: file.name,
            });

            setTimeout(() => {
                this.scanImages();
            }, 100);
            sendAnalytics('image upload');
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(imageName: string): Promise<void> {
        try {
            const projectFolder = this.projectsManager.project?.folderPath;
            if (!projectFolder) {
                throw new Error('Project folder not found');
            }
            await invokeMainChannel<string, string>(
                MainChannels.DELETE_IMAGE_FROM_PROJECT,
                projectFolder,
                imageName,
            );
            this.scanImages();
            sendAnalytics('image delete');
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async rename(imageName: string, newName: string): Promise<void> {
        try {
            const projectFolder = this.projectsManager.project?.folderPath;
            if (!projectFolder) {
                throw new Error('Project folder not found');
            }
            await invokeMainChannel<string, string>(
                MainChannels.RENAME_IMAGE_IN_PROJECT,
                projectFolder,
                imageName,
                newName,
            );
            this.scanImages();
            sendAnalytics('image rename');
        } catch (error) {
            console.error('Error renaming image:', error);
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

        const fileName = `${nanoid(4)}.${mime.getExtension(mimeType)}`;
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
        setTimeout(() => {
            this.scanImages();
        }, 2000);
        sendAnalytics('image insert', { mimeType });
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
            webviewId: element.frameId,
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
        this.images = [];
    }
}
