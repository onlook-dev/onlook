import type { EditorEngine } from '@/components/store/editor/engine';
import type { ProjectManager } from '@/components/store/projects';
import { sendAnalytics } from '@/utils/analytics';
import type {
    Action,
    CodeDiff, CodeDiffRequest,
    WriteCodeAction
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { getEditTextRequests, getGroupRequests, getInsertImageRequests, getInsertRequests, getMoveRequests, getRemoveImageRequests, getRemoveRequests, getStyleRequests, getUngroupRequests, getWriteCodeRequests } from './requests';

export class CodeManager {
    isExecuting = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    /**
     * Group requests by file then by oid
     */

    async write(action: Action) {
        this.writeQueue.push(action);
        if (!this.isExecuting) {
            this.isExecuting = true;
            this.debouncedProcessQueue();
        }
    }

    private async collectRequests(action: Action): Promise<CodeDiffRequest[]> {
        switch (action.type) {
            case 'update-style':
                return await getStyleRequests(action);
            case 'insert-element':
                return await getInsertRequests(action);
            case 'move-element':
                return await getMoveRequests(action);
            case 'remove-element':
                return await getRemoveRequests(action);
            case 'edit-text':
                return await getEditTextRequests(action);
            case 'group-elements':
                return await getGroupRequests(action);
            case 'ungroup-elements':
                return await getUngroupRequests(action);
            case 'insert-image':
                return getInsertImageRequests(action);
            case 'remove-image':
                return getRemoveImageRequests(action);
            case 'write-code':
                return await getWriteCodeRequests(action);
            default:
                assertNever(action);
        }
    }

    async writeRequest(requests: CodeDiffRequest[]) {
        console.log('writeRequest', requests);
    }

    runCodeDiffs(codeDiffs: CodeDiff[]) {
        const writeCodeAction: WriteCodeAction = {
            type: 'write-code',
            diffs: codeDiffs,
        };
        this.editorEngine.action.run(writeCodeAction);
    }

    clear() {
    }
}
