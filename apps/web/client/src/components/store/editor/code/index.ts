import type { EditorEngine } from '@/components/store/editor/engine';
import {
    EditorTabValue,
    type Action,
    type CodeDiffRequest,
    type DomElement,
    type FileToRequests,
} from '@onlook/models';
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

    viewSourceFile(fileName: string) {
        console.log('viewSourceFile', fileName);
    }

    viewCodeBlock(oid: string) {
        try {
            this.editorEngine.state.rightPanelTab = EditorTabValue.DEV;
            const element =
                this.editorEngine.elements.selected.find((el: DomElement) => el.oid === oid) ||
                this.editorEngine.elements.selected.find((el: DomElement) => el.instanceId === oid);

            if (element) {
                setTimeout(() => {
                    this.editorEngine.elements.selected = [element];
                }, 500);
            }
        } catch (error) {
            console.error('Error viewing source:', error);
        }
    }

    async write(action: Action) {
        // TODO: This is a hack to write code, we should refactor this
        if (action.type === 'write-code' && action.diffs[0]) {
            await this.editorEngine.sandbox.writeFile(
                action.diffs[0].path,
                action.diffs[0].generated,
            );
        } else {
            const requests = await this.collectRequests(action);
            await this.writeRequest(requests);
        }
    }

    async writeRequest(requests: CodeDiffRequest[]) {
        const groupedRequests = await this.groupRequestByFile(requests);
        const codeDiffs = await processGroupedRequests(groupedRequests);
        for (const diff of codeDiffs) {
            await this.editorEngine.sandbox.writeFile(diff.path, diff.generated);
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
            const templateNode = await this.editorEngine.sandbox.getTemplateNode(request.oid);
            if (!templateNode) {
                console.error(`Template node not found for oid: ${request.oid}`);
                continue;
            }
            const codeBlock = await this.editorEngine.sandbox.readFile(templateNode.path);
            if (!codeBlock) {
                console.error(`Failed to read file: ${templateNode.path}`);
                continue;
            }
            const path = templateNode.path;

            let groupedRequest = requestByFile.get(path);
            if (!groupedRequest) {
                groupedRequest = { oidToRequest: new Map(), content: codeBlock };
            }
            groupedRequest.oidToRequest.set(request.oid, request);
            requestByFile.set(path, groupedRequest);
        }
        return requestByFile;
    }

    clear() { }
}
