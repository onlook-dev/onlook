import { invokeMainChannel, sendAnalytics, sendToWebview } from '@/lib/utils';
import type {
    Action,
    EditTextAction,
    GroupElementsAction,
    InsertElementAction,
    MoveElementAction,
    RemoveElementAction,
    UngroupElementsAction,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import {
    CodeActionType,
    type CodeEditText,
    type CodeGroup,
    type CodeInsert,
    type CodeMove,
    type CodeRemove,
    type CodeStyle,
    type CodeUngroup,
} from '@onlook/models/actions';
import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import { MainChannels, WebviewChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { getOrCreateCodeDiffRequest, getTailwindClassChangeFromStyle } from './helpers';
import { getInsertedElement } from './insert';
import { assertNever } from '/common/helpers';

export class CodeManager {
    isExecuting = false;
    private writeQueue: Action[] = [];

    constructor(private editorEngine: EditorEngine) {
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

    async getCodeBlock(oid: string | null): Promise<string | null> {
        if (!oid) {
            console.error('Failed to get code block. No oid found.');
            return null;
        }
        return invokeMainChannel(MainChannels.GET_CODE_BLOCK, oid);
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
            default:
                assertNever(action);
        }
        sendAnalytics('write code');
    }

    async writeStyle({ targets, style }: UpdateStyleAction) {
        const styleChanges: CodeStyle[] = [];
        targets.forEach((target) => {
            if (!target.oid) {
                console.error('No oid found for style change');
                return;
            }
            styleChanges.push({
                oid: target.oid,
                styles: {
                    [style]: target.change.updated,
                },
            });
        });

        const requests = await this.getCodeDiffRequests({ styleChanges });
        await this.getAndWriteCodeDiff(requests);
    }

    async writeInsert({ location, element, pasteParams }: InsertElementAction) {
        const insertedEls = [getInsertedElement(element, location, pasteParams)];
        const requests = await this.getCodeDiffRequests({ insertedEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeRemove({ element }: RemoveElementAction) {
        const removedEls: CodeRemove[] = [
            {
                oid: element.oid,
                type: CodeActionType.REMOVE,
            },
        ];

        const requests = await this.getCodeDiffRequests({ removedEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeEditText({ targets, newContent }: EditTextAction) {
        const textEditEls: CodeEditText[] = [];
        for (const target of targets) {
            if (!target.oid) {
                console.error('No oid found for text edit');
                continue;
            }
            textEditEls.push({
                oid: target.oid,
                content: newContent,
            });
        }
        const requestMap = await this.getCodeDiffRequests({ textEditEls });
        await this.getAndWriteCodeDiff(requestMap);
    }

    private async writeMove({ targets, location }: MoveElementAction) {
        const movedEls: CodeMove[] = [];
        for (const target of targets) {
            if (!target.oid) {
                console.error('No oid found for move');
                continue;
            }
            movedEls.push({
                oid: target.oid,
                type: CodeActionType.MOVE,
                location,
            });
        }
        const requests = await this.getCodeDiffRequests({ movedEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeGroup(action: GroupElementsAction) {
        if (!action.parent.oid) {
            console.error('No parent oid found for group');
            return;
        }
        const groupEls: CodeGroup[] = [
            {
                type: CodeActionType.GROUP,
                oid: action.parent.oid,
                container: action.container,
                children: action.children,
            },
        ];
        const requests = await this.getCodeDiffRequests({ groupEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeUngroup(action: UngroupElementsAction) {
        if (!action.parent.oid) {
            console.error('No parent oid found for ungroup');
            return;
        }
        const ungroupEls: CodeUngroup[] = [
            {
                type: CodeActionType.UNGROUP,
                oid: action.parent.oid,
                container: action.container,
                children: action.children,
            },
        ];
        const requests = await this.getCodeDiffRequests({ ungroupEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeCode(action: WriteCodeAction) {
        const res = await invokeMainChannel(MainChannels.WRITE_CODE_DIFFS, action.diffs);
        if (!res) {
            console.error('Failed to write code');
            return false;
        }
        return true;
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

    private async getCodeDiffRequests({
        styleChanges,
        insertedEls,
        removedEls,
        movedEls,
        textEditEls,
        groupEls,
        ungroupEls,
    }: {
        styleChanges?: CodeStyle[];
        insertedEls?: CodeInsert[];
        removedEls?: CodeRemove[];
        movedEls?: CodeMove[];
        textEditEls?: CodeEditText[];
        groupEls?: CodeGroup[];
        ungroupEls?: CodeUngroup[];
    }): Promise<CodeDiffRequest[]> {
        const oidToRequest = new Map<string, CodeDiffRequest>();
        await this.processStyleChanges(styleChanges || [], oidToRequest);
        await this.processInsertedElements(insertedEls || [], oidToRequest);
        await this.processRemovedElements(removedEls || [], oidToRequest);
        await this.processTextEditElements(textEditEls || [], oidToRequest);
        await this.processMovedElements(movedEls || [], oidToRequest);
        await this.processGroupElements(groupEls || [], oidToRequest);
        await this.processUngroupElements(ungroupEls || [], oidToRequest);

        return Array.from(oidToRequest.values());
    }

    private async processStyleChanges(
        styleChanges: CodeStyle[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ): Promise<void> {
        for (const change of styleChanges) {
            const request = await getOrCreateCodeDiffRequest(change.oid, oidToCodeChange);
            getTailwindClassChangeFromStyle(request, change.styles);
        }
    }

    private async processInsertedElements(
        insertedEls: CodeInsert[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ): Promise<void> {
        for (const insertedEl of insertedEls) {
            if (!insertedEl.location.targetOid) {
                console.error('No oid found for inserted element');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(
                insertedEl.location.targetOid,
                oidToCodeChange,
            );
            request.insertedElements.push(insertedEl);
        }
    }

    private async processRemovedElements(
        removedEls: CodeRemove[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ): Promise<void> {
        for (const removedEl of removedEls) {
            const request = await getOrCreateCodeDiffRequest(removedEl.oid, oidToCodeChange);
            request.removedElements.push(removedEl);
        }
    }

    private async processTextEditElements(
        textEditEls: CodeEditText[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ) {
        for (const textEl of textEditEls) {
            const request = await getOrCreateCodeDiffRequest(textEl.oid, oidToCodeChange);
            request.textContent = textEl.content;
        }
    }

    private async processMovedElements(
        movedEls: CodeMove[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ): Promise<void> {
        for (const movedEl of movedEls) {
            if (!movedEl.location.targetOid) {
                console.error('No oid found for moved element');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(
                movedEl.location.targetOid,
                oidToCodeChange,
            );
            request.movedElements.push(movedEl);
        }
    }

    private async processGroupElements(
        groupEls: CodeGroup[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ) {
        for (const groupEl of groupEls) {
            const request = await getOrCreateCodeDiffRequest(groupEl.oid, oidToCodeChange);
            request.groupElements.push(groupEl);
        }
    }

    private async processUngroupElements(
        ungroupEls: CodeUngroup[],
        oidToCodeChange: Map<string, CodeDiffRequest>,
    ) {
        for (const ungroupEl of ungroupEls) {
            const request = await getOrCreateCodeDiffRequest(ungroupEl.oid, oidToCodeChange);
            request.ungroupElements.push(ungroupEl);
        }
    }

    dispose() {
        // Clear write queue
        this.writeQueue = [];
        this.isExecuting = false;

        // Clear references
        this.editorEngine = null as any;
    }
}
