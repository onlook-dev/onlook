import type { EditorEngine } from '@/components/store/editor/engine';
import {
    type Action,
    type CodeDiffRequest,
    type FileToRequests
} from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { assertNever } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import {
    getEditTextRequests,
    getGroupRequests,
    getInsertImageRequests,
    getInsertRequests,
    getMoveRequests,
    getRemoveImageRequests,
    getRemoveRequests,
    getStyleRequests,
    getUngroupRequests,
    getWriteCodeRequests,
    processGroupedRequests,
} from './requests';

export class CodeManager {
    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async write(action: Action) {
        try {
            // TODO: This is a hack to write code, we should refactor this
            if (action.type === 'write-code' && action.diffs[0]) {
                await this.editorEngine.activeSandbox.writeFile(
                    action.diffs[0].path,
                    action.diffs[0].generated,
                );
            } else {
                const requests = await this.collectRequests(action);
                await this.writeRequest(requests);
            }
        } catch (error) {
            console.error('Error writing requests:', error);
            toast.error('Error writing requests', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            this.editorEngine.branches.activeError.addCodeApplicationError(error instanceof Error ? error.message : 'Unknown error', action);
        }
    }

    async writeRequest(requests: CodeDiffRequest[]) {
        const groupedRequests = await this.groupRequestByFile(requests);
        const codeDiffs = await processGroupedRequests(groupedRequests);
        for (const diff of codeDiffs) {
            await this.editorEngine.activeSandbox.writeFile(diff.path, diff.generated);
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

    async groupRequestByFile(requests: CodeDiffRequest[]): Promise<FileToRequests> {
        const requestByFile: FileToRequests = new Map();

        for (const request of requests) {
            const templateNode = this.editorEngine.templateNodes.getTemplateNode(request.oid);
            if (!templateNode) {
                throw new Error(`Template node not found for oid: ${request.oid}`);
            }
            const file = await this.editorEngine.activeSandbox.readFile(templateNode.path);
            if (!file || file.type === 'binary') {
                throw new Error(`Failed to read file: ${templateNode.path}`);
            }
            const path = templateNode.path;

            let groupedRequest = requestByFile.get(path);
            if (!groupedRequest) {
                groupedRequest = { oidToRequest: new Map(), content: file.content };
            }
            groupedRequest.oidToRequest.set(request.oid, request);
            requestByFile.set(path, groupedRequest);
        }
        return requestByFile;
    }

    clear() { }
}
