import type { ActionTarget, InsertImageAction } from '@onlook/models/actions';
import type { EditorEngine } from '..';

export class ImageManager {
    constructor(private editorEngine: EditorEngine) {}

    async insertBackground(
        base64Image: string,
        styles: Record<string, string>,
        mimeType: string,
    ): Promise<InsertImageAction | undefined> {
        console.log('insertBackground', styles, mimeType);
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

        const action: InsertImageAction = {
            type: 'insert-image',
            targets: targets,
            image: base64Image,
            styles,
            mimeType,
        };

        this.editorEngine.action.run(action);
    }

    dispose() {
        // Clear references
        this.editorEngine = null as any;
    }
}
