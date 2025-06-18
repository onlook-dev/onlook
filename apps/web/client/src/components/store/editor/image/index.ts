import type { ProjectManager } from '@/components/store/project/manager';
import type { ActionTarget, ImageContentData, InsertImageAction } from '@onlook/models/actions';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { api } from '@/trpc/client';
import { DefaultSettings } from '@onlook/constants';
export class ImageManager {
    private images: ImageContentData[] = [];

    constructor(
        private editorEngine: EditorEngine,
    ) {
        // this.scanImages();
        makeAutoObservable(this);
    }

    async upload(file: File): Promise<void> {
        try {
            console.log('uploading image', file);
            
            const buffer = await file.arrayBuffer();
            const path = `${DefaultSettings.IMAGE_FOLDER}/${file.name}`;

            const response = await this.editorEngine.sandbox.writeBinaryFile(
                path,
                new Uint8Array(buffer),
            );

            console.log('response', response);
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async delete(imageName: string): Promise<void> {
        try {
            // const projectFolder = this.projectManager.project?.folderPath;
            // if (!projectFolder) {
            //     throw new Error('Project folder not found');
            // }
            // await invokeMainChannel<string, string>(
            //     MainChannels.DELETE_IMAGE_FROM_PROJECT,
            //     projectFolder,
            //     imageName,
            // );
            // this.scanImages();
            // sendAnalytics('image delete');
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async rename(imageName: string, newName: string): Promise<void> {
        try {
            // const projectFolder = this.projectManager.project?.folderPath;
            // if (!projectFolder) {
            //     throw new Error('Project folder not found');
            // }
            // await invokeMainChannel<string, string>(
            //     MainChannels.RENAME_IMAGE_IN_PROJECT,
            //     projectFolder,
            //     imageName,
            //     newName,
            // );
            // this.scanImages();
            // sendAnalytics('image rename');
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
        // const projectRoot = this.projectManager.project?.folderPath;

        // if (!projectRoot) {
        //     console.warn('No project root found');
        //     return;
        // }
        // const images = await invokeMainChannel<string, ImageContentData[]>(
        //     MainChannels.SCAN_IMAGES_IN_PROJECT,
        //     projectRoot,
        // );
        // if (images?.length) {
        //     this.images = images;
        // } else {
        //     this.images = [];
        // }
    }

    clear() {
        this.images = [];
    }
}
