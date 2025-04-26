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
import { getEditTextRequests, getGroupRequests, getInsertImageRequests, getInsertRequests, getMoveRequests, getRemoveImageRequests, getRemoveRequests, getStyleRequests, getUngroupRequests } from './requests';

export class CodeManager {
    isExecuting = false;
    private writeQueue: Action[] = [];
    private pendingRequests: CodeDiffRequest[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    async write(action: Action) {
        this.writeQueue.push(action);
        if (!this.isExecuting) {
            this.isExecuting = true;
            this.debouncedProcessQueue();
        }
    }

    private processQueue = async () => {
        try {
            // Process all pending actions and collect the requests
            while (this.writeQueue.length > 0) {
                const action = this.writeQueue.shift();
                if (action) {
                    const requests = await this.collectRequests(action);
                    if (Array.isArray(requests)) {
                        this.pendingRequests.push(...requests);
                    }
                }
            }

            // Write all collected requests at once
            if (this.pendingRequests.length > 0) {
                await this.writeRequest(this.pendingRequests);
                this.pendingRequests = [];
                sendAnalytics('write code');
            }
        } finally {
            this.isExecuting = false;
            // Check if more actions were added while processing
            if (this.writeQueue.length > 0) {
                this.isExecuting = true;
                this.debouncedProcessQueue();
            }
        }
    };

    private debouncedProcessQueue = debounce(this.processQueue, 300);

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
                return [];
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
        this.writeQueue = [];
        this.pendingRequests = [];
        this.isExecuting = false;
        this.debouncedProcessQueue.cancel();
        this.editorEngine = null as any;
    }
}
