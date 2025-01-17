import type { ActionTarget, InsertImageAction } from '@onlook/models/actions';
import type { EditorEngine } from '..';
import type { ProjectsManager } from '@/lib/projects';

export class ImageManager {
    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {}

    async insertBackground(
        base64Image: string,
        styles: Record<string, string>,
    ): Promise<InsertImageAction | undefined> {
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
        };

        this.editorEngine.action.run(action);
    }

    dispose() {
        // Clear references
        this.editorEngine = null as any;
    }
}
