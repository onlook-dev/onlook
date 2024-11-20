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
import type { TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { getGroupElement, getUngroupElement } from './group';
import { getOrCreateCodeDiffRequest, getTailwindClassChangeFromStyle } from './helpers';
import { getInsertedElement } from './insert';
import { getRemovedElement } from './remove';
import { assertNever } from '/common/helpers';

export class CodeManager {
    isExecuting = false;
    private writeQueue: Action[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    getCodeDiff(requests: CodeDiffRequest[]): Promise<CodeDiff[]> {
        return invokeMainChannel(MainChannels.GET_CODE_DIFFS, requests);
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

    async getFileContent(path: string): Promise<string | null> {
        return invokeMainChannel(MainChannels.GET_FILE_CONTENT, path);
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

    async writeInsert({ location, element, codeBlock }: InsertElementAction) {
        const insertedEls = [getInsertedElement(element, location, codeBlock)];
        const requests = await this.getCodeDiffRequests({ insertedEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeRemove({ location, element }: RemoveElementAction) {
        const removedEls = [getRemovedElement(location, element)];
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
        this.getAndWriteCodeDiff(requestMap);
    }

    private async writeMove({ targets, location }: MoveElementAction) {
        const movedEls: CodeMove[] = [];
        for (const target of targets) {
            const childTemplateNode = this.editorEngine.ast.getAnyTemplateNode(target.selector);
            if (!childTemplateNode) {
                console.error('Failed to get template node for moving selector', target.selector);
                continue;
            }
            movedEls.push({
                type: CodeActionType.MOVE,
                location: location,
                selector: target.selector,
                childTemplateNode: childTemplateNode,
                uuid: target.uuid,
            });
        }
        const requests = await this.getCodeDiffRequests({ movedEls });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeGroup(action: GroupElementsAction) {
        const groupEl = getGroupElement(action.targets, action.location, action.container);
        const requests = await this.getCodeDiffRequests({ groupEls: [groupEl] });
        await this.getAndWriteCodeDiff(requests);
    }

    private async writeUngroup(action: UngroupElementsAction) {
        const ungroupEl = getUngroupElement(action.targets, action.location, action.container);
        const requests = await this.getCodeDiffRequests({ ungroupEls: [ungroupEl] });
        await this.getAndWriteCodeDiff(requests);
    }

    async getAndWriteCodeDiff(requests: CodeDiffRequest[]) {
        const codeDiffs = await this.getCodeDiff(requests);
        const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (codeDiffs.length === 0) {
            console.error('No code diffs found');
            return false;
        }

        if (res) {
            setTimeout(() => {
                this.editorEngine.webviews.getAll().forEach((webview) => {
                    sendToWebview(webview, WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
                });
            }, 500);
        }
        return res;
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
            if (!removedEl.location.targetOid) {
                console.error('No oid found for inserted element');
                continue;
            }
            const request = await getOrCreateCodeDiffRequest(
                removedEl.location.targetOid,
                oidToCodeChange,
            );
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
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const movedEl of movedEls) {
            const parentTemplateNode = this.editorEngine.ast.getAnyTemplateNode(
                movedEl.location.targetSelector,
            );
            if (!parentTemplateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                parentTemplateNode,
                movedEl.location.targetSelector,
                templateToCodeChange,
            );
            const childTemplateNode = this.editorEngine.ast.getAnyTemplateNode(movedEl.selector);
            if (!childTemplateNode) {
                continue;
            }
            const movedElWithTemplate = { ...movedEl, templateNode: childTemplateNode };
            request.movedElements.push(movedElWithTemplate);
        }
    }

    private async processGroupElements(
        groupEls: CodeGroup[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ) {
        for (const groupEl of groupEls) {
            const templateNode = this.editorEngine.ast.getAnyTemplateNode(
                groupEl.location.targetSelector,
            );
            if (!templateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                templateNode,
                groupEl.location.targetSelector,
                templateToCodeChange,
            );
            request.groupElements.push(groupEl);
        }
    }

    private async processUngroupElements(
        ungroupEls: CodeUngroup[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ) {
        for (const ungroupEl of ungroupEls) {
            const templateNode = this.editorEngine.ast.getAnyTemplateNode(
                ungroupEl.location.targetSelector,
            );
            if (!templateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                templateNode,
                ungroupEl.location.targetSelector,
                templateToCodeChange,
            );
            request.ungroupElements.push(ungroupEl);
        }
    }
}
