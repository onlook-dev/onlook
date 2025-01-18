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
    }

    remove() {
        this.editorEngine.style.update('backgroundImage', 'none');
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
