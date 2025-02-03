import { sendAnalytics, compressImage } from '@/lib/utils';
import type { ActionTarget, InsertImageAction } from '@onlook/models/actions';
import { getExtension } from 'mime-lite';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';

export class ImageManager {
    constructor(private editorEngine: EditorEngine) {}

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

    dispose() {
        // Clear references
        this.editorEngine = null as any;
    }
}
