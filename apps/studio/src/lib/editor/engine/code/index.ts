import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics, sendToWebview } from '@/lib/utils';
import type {
    Action,
    CodeInsertImage,
    CodeRemoveImage,
    EditTextAction,
    GroupElementsAction,
    InsertElementAction,
    InsertImageAction,
    MoveElementAction,
    RemoveElementAction,
    RemoveImageAction,
    UngroupElementsAction,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import {
    CodeActionType,
    type CodeGroup,
    type CodeMove,
    type CodeRemove,
    type CodeUngroup,
} from '@onlook/models/actions';
import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import { MainChannels, WebviewChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { addTailwindToRequest, getOrCreateCodeDiffRequest } from './helpers';
import { getInsertedElement } from './insert';
import { assertNever } from '/common/helpers';

export class CodeManager {
    isExecuting = false;
    private writeQueue: Action[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
    }

    viewSource(oid: string | null): void {
        if (!oid) {
            console.error('No oid found.');
            return;
        }
        invokeMainChannel(MainChannels.VIEW_SOURCE_CODE, oid);
        sendAnalytics('view source code');
    }

    viewSourceFile(filePath: string | null): void {
        if (!filePath) {
            console.error('No file path found.');
            return;
        }
        invokeMainChannel(MainChannels.VIEW_SOURCE_FILE, filePath);
        sendAnalytics('view source code');
    }

    async getCodeBlock(oid: string | null, stripIds: boolean = false): Promise<string | null> {
        if (!oid) {
            console.error('Failed to get code block. No oid found.');
            return null;
        }
        return invokeMainChannel(MainChannels.GET_CODE_BLOCK, {
            oid,
            stripIds,
        });
    }

    async getFileContent(filePath: string, stripIds: boolean): Promise<string | null> {
        return invokeMainChannel(MainChannels.GET_FILE_CONTENT, { filePath, stripIds });
    }

    async write(action: Action) {
        // TODO: These can all be processed at once at the getCodeDiffRequests level
        this.writeQueue.push(action);
        if (!this.isExecuting) {
            await this.processWriteQueue();
        }
    }

    private async processWriteQueue() {
        this.isExecuting = true;
        if (this.writeQueue.length > 0) {
            const action = this.writeQueue.shift();
            if (action) {
                await this.executeWrite(action);
            }
        }
        setTimeout(() => {
            this.isExecuting = false;
            if (this.writeQueue.length > 0) {
                this.processWriteQueue();
            }
        }, 300);
    }

    private async executeWrite(action: Action) {
        switch (action.type) {
            case 'update-style':
                await this.writeStyle(action);
                break;
            case 'insert-element':
                await this.writeInsert(action);
                break;
            case 'move-element':
                await this.writeMove(action);
                break;
            case 'remove-element':
                await this.writeRemove(action);
                break;
            case 'edit-text':
                await this.writeEditText(action);
                break;
            case 'group-elements':
                this.writeGroup(action);
                break;
            case 'ungroup-elements':
                this.writeUngroup(action);
                break;
            case 'write-code':
                this.writeCode(action);
                break;
            case 'insert-image':
                this.writeInsertImage(action);
                break;
            case 'remove-image':
                this.writeRemoveImage(action);
                break;
            default:
                assertNever(action);
        }
        sendAnalytics('write code');
    }

    async writeStyle({ targets }: UpdateStyleAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();

        for (const target of targets) {
            if (!target.oid) {
                console.error('No oid found for style change');
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
            addTailwindToRequest(request, target.change.updated);
        }

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    async writeInsert({ location, element, pasteParams }: InsertElementAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const insertedEl = getInsertedElement(element, location, pasteParams);

        if (!insertedEl.location.targetOid) {
            console.error('No oid found for inserted element');
            return;
        }

        const request = await getOrCreateCodeDiffRequest(
            insertedEl.location.targetOid,
            oidToCodeChange,
        );
        request.structureChanges.push(insertedEl);

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeRemove({ element }: RemoveElementAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const removedEl: CodeRemove = {
            oid: element.oid,
            type: CodeActionType.REMOVE,
        };

        const request = await getOrCreateCodeDiffRequest(removedEl.oid, oidToCodeChange);
        request.structureChanges.push(removedEl);
        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeEditText({ targets, newContent }: EditTextAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();

        for (const target of targets) {
            if (!target.oid) {
                console.error('No oid found for text edit');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
            request.textContent = newContent;
        }

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeMove({ targets, location }: MoveElementAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();

        for (const target of targets) {
            if (!target.oid) {
                console.error('No oid found for move');
                continue;
            }

            if (!location.targetOid) {
                console.error('No target oid found for moved element');
                continue;
            }

            const movedEl: CodeMove = {
                oid: target.oid,
                type: CodeActionType.MOVE,
                location,
            };

            const request = await getOrCreateCodeDiffRequest(location.targetOid, oidToCodeChange);
            request.structureChanges.push(movedEl);
        }

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeGroup(action: GroupElementsAction) {
        if (!action.parent.oid) {
            console.error('No parent oid found for group');
            return;
        }
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const groupEl: CodeGroup = {
            type: CodeActionType.GROUP,
            oid: action.parent.oid,
            container: action.container,
            children: action.children,
        };

        const request = await getOrCreateCodeDiffRequest(groupEl.oid, oidToCodeChange);
        request.structureChanges.push(groupEl);

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeUngroup(action: UngroupElementsAction) {
        if (!action.parent.oid) {
            console.error('No parent oid found for ungroup');
            return;
        }
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const ungroupEl: CodeUngroup = {
            type: CodeActionType.UNGROUP,
            oid: action.parent.oid,
            container: action.container,
            children: action.children,
        };

        const request = await getOrCreateCodeDiffRequest(ungroupEl.oid, oidToCodeChange);
        request.structureChanges.push(ungroupEl);

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeCode(action: WriteCodeAction) {
        const res = await invokeMainChannel(MainChannels.WRITE_CODE_DIFFS, action.diffs);
        if (!res) {
            console.error('Failed to write code');
            return false;
        }
        return true;
    }

    private async writeInsertImage(action: InsertImageAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const projectFolder = this.projectsManager.project?.folderPath;

        if (!projectFolder) {
            console.error('Failed to write image, projectFolder not found');
            return;
        }

        const insertImage: CodeInsertImage = {
            ...action,
            folderPath: projectFolder,
            type: CodeActionType.INSERT_IMAGE,
        };

        for (const target of action.targets) {
            if (!target.oid) {
                console.error('No oid found for inserted image');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
            request.structureChanges.push(insertImage);
        }

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    private async writeRemoveImage(action: RemoveImageAction) {
        const oidToCodeChange = new Map<string, CodeDiffRequest>();
        const removeImage: CodeRemoveImage = {
            ...action,
            type: CodeActionType.REMOVE_IMAGE,
        };

        for (const target of action.targets) {
            if (!target.oid) {
                console.error('No oid found for removed image');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
            request.structureChanges.push(removeImage);
        }

        await this.getAndWriteCodeDiff(Array.from(oidToCodeChange.values()));
    }

    async getAndWriteCodeDiff(requests: CodeDiffRequest[], useHistory: boolean = false) {
        let codeDiffs: CodeDiff[];
        if (useHistory) {
            codeDiffs = await this.getCodeDiffs([requests[0]]);
            this.runCodeDiffs(codeDiffs);
        } else {
            // Write code directly
            codeDiffs = await invokeMainChannel(MainChannels.GET_AND_WRITE_CODE_DIFFS, {
                requests,
                write: true,
            });
        }

        if (codeDiffs.length === 0) {
            console.error('No code diffs found');
            return false;
        }

        this.editorEngine.webviews.getAll().forEach((webview) => {
            sendToWebview(webview, WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
        });

        return true;
    }

    runCodeDiffs(codeDiffs: CodeDiff[]) {
        const writeCodeAction: WriteCodeAction = {
            type: 'write-code',
            diffs: codeDiffs,
        };
        this.editorEngine.action.run(writeCodeAction);
    }

    async getCodeDiffs(requests: CodeDiffRequest[]): Promise<CodeDiff[]> {
        return invokeMainChannel(MainChannels.GET_AND_WRITE_CODE_DIFFS, {
            requests,
            write: false,
        });
    }

    dispose() {
        // Clear write queue
        this.writeQueue = [];
        this.isExecuting = false;

        // Clear references
        this.editorEngine = null as any;
    }
}
