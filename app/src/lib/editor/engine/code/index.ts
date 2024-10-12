import { sendAnalytics } from '@/lib/utils';
import { makeAutoObservable } from 'mobx';
import { EditorEngine } from '..';
import { getOrCreateCodeDiffRequest, getTailwindClassChangeFromStyle } from './helpers';
import { getInsertedElement } from './insert';
import { getRemovedElement } from './remove';
import { MainChannels, WebviewChannels } from '/common/constants';
import { assertNever } from '/common/helpers';
import {
    Action,
    EditTextAction,
    InsertElementAction,
    MoveElementAction,
    RemoveElementAction,
    UpdateStyleAction,
} from '/common/models/actions';
import {
    CodeActionType,
    CodeEditText,
    CodeInsert,
    CodeMove,
    CodeRemove,
    CodeStyle,
} from '/common/models/actions/code';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

export class CodeManager {
    isExecuting = false;
    private moveCleanDebounceTimer: Timer | null = null;
    private queuedMoveFilesToClean: Set<string> = new Set();
    private writeQueue: Action[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    getCodeDiff(requests: CodeDiffRequest[]): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_CODE_DIFFS, JSON.parse(JSON.stringify(requests)));
    }

    viewSource(templateNode?: TemplateNode): void {
        if (!templateNode) {
            console.error('No template node found.');
            return;
        }
        window.api.invoke(MainChannels.VIEW_SOURCE_CODE, templateNode);
        sendAnalytics('view source code');
    }

    async getCodeBlock(templateNode?: TemplateNode): Promise<string | null> {
        if (!templateNode) {
            console.error('No template node found.');
            return null;
        }
        return window.api.invoke(MainChannels.GET_CODE_BLOCK, templateNode);
    }

    async write(action: Action) {
        this.writeQueue.push(action);
        if (!this.isExecuting) {
            await this.processWriteQueue();
        }
    }

    private async processWriteQueue() {
        this.isExecuting = true;
        while (this.writeQueue.length > 0) {
            const action = this.writeQueue.shift();
            if (action) {
                await this.executeWrite(action);
            }
        }
        this.isExecuting = false;
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
            default:
                assertNever(action);
        }
        sendAnalytics('write code');
    }

    async writeStyle({ targets, style }: UpdateStyleAction) {
        const styleChanges: CodeStyle[] = [];
        targets.map((target) => {
            styleChanges.push({
                selector: target.selector,
                styles: {
                    [style]: target.change.updated,
                },
            });
        });

        const requests = await this.getCodeDiffRequests({ styleChanges });
        this.getAndWriteCodeDiff(requests);
    }

    async writeInsert({ location, element, codeBlock }: InsertElementAction) {
        const insertedEls = [getInsertedElement(element, location, codeBlock)];
        const requests = await this.getCodeDiffRequests({ insertedEls });
        this.getAndWriteCodeDiff(requests);
    }

    private async writeRemove({ location }: RemoveElementAction) {
        const removedEls = [getRemovedElement(location)];
        const requests = await this.getCodeDiffRequests({ removedEls });
        this.getAndWriteCodeDiff(requests);
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
            });
        }

        const requests = await this.getCodeDiffRequests({ movedEls });
        const res = await this.getAndWriteCodeDiff(requests);
        if (res) {
            requests.forEach((request) =>
                this.queuedMoveFilesToClean.add(request.templateNode.path),
            );
            this.debounceMoveCleanup();
        }
    }

    private async writeEditText({ targets, newContent }: EditTextAction) {
        const textEditEls: CodeEditText[] = [];

        for (const target of targets) {
            textEditEls.push({
                selector: target.selector,
                content: newContent,
            });
        }

        const requestMap = await this.getCodeDiffRequests({ textEditEls });
        this.getAndWriteCodeDiff(requestMap);
    }

    private async getAndWriteCodeDiff(requests: CodeDiffRequest[]) {
        const codeDiffs = await this.getCodeDiff(requests);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (codeDiffs.length === 0) {
            console.error('No code diffs found');
            return false;
        }

        if (res) {
            setTimeout(() => {
                this.editorEngine.webviews.getAll().forEach((webview) => {
                    webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
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
    }: {
        styleChanges?: CodeStyle[];
        insertedEls?: CodeInsert[];
        removedEls?: CodeRemove[];
        movedEls?: CodeMove[];
        textEditEls?: CodeEditText[];
    }): Promise<CodeDiffRequest[]> {
        const templateToRequest = new Map<TemplateNode, CodeDiffRequest>();
        await this.processStyleChanges(styleChanges || [], templateToRequest);
        await this.processInsertedElements(insertedEls || [], templateToRequest);
        await this.processMovedElements(movedEls || [], templateToRequest);
        await this.processTextEditElements(textEditEls || [], templateToRequest);
        await this.processRemovedElements(removedEls || [], templateToRequest);
        return Array.from(templateToRequest.values());
    }

    private debounceMoveCleanup() {
        if (this.moveCleanDebounceTimer) {
            clearTimeout(this.moveCleanDebounceTimer);
        }

        this.moveCleanDebounceTimer = setTimeout(() => {
            if (this.queuedMoveFilesToClean.size > 0) {
                const files = Array.from(this.queuedMoveFilesToClean);
                window.api.invoke(MainChannels.CLEAN_MOVE_KEYS, files);
                this.queuedMoveFilesToClean.clear();
            }
            this.moveCleanDebounceTimer = null;
        }, 1000);
    }

    private async processStyleChanges(
        styleChanges: CodeStyle[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const change of styleChanges) {
            const templateNode = await this.getTemplateNodeForSelector(change.selector);
            if (!templateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                templateNode,
                change.selector,
                templateToCodeChange,
            );
            getTailwindClassChangeFromStyle(request, change.styles);
        }
    }

    private async processInsertedElements(
        insertedEls: CodeInsert[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const insertedEl of insertedEls) {
            const targetTemplateNode = await this.getTemplateNodeForSelector(
                insertedEl.location.targetSelector,
            );
            if (!targetTemplateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                targetTemplateNode,
                insertedEl.location.targetSelector,
                templateToCodeChange,
            );
            request.insertedElements.push(insertedEl);
        }
    }

    private async processRemovedElements(
        removedEls: CodeRemove[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const removedEl of removedEls) {
            const targetTemplateNode = await this.getTemplateNodeForSelector(
                removedEl.location.targetSelector,
            );
            if (!targetTemplateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                targetTemplateNode,
                removedEl.location.targetSelector,
                templateToCodeChange,
            );
            request.removedElements.push(removedEl);
        }
    }

    private async processMovedElements(
        movedEls: CodeMove[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const movedEl of movedEls) {
            const parentTemplateNode = await this.getTemplateNodeForSelector(
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
            const childTemplateNode = await this.getTemplateNodeForSelector(movedEl.selector);
            if (!childTemplateNode) {
                continue;
            }
            const movedElWithTemplate = { ...movedEl, templateNode: childTemplateNode };
            request.movedElements.push(movedElWithTemplate);
        }
    }

    private async processTextEditElements(
        textEditEls: CodeEditText[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ) {
        for (const textEl of textEditEls) {
            const templateNode = await this.getTemplateNodeForSelector(textEl.selector);
            if (!templateNode) {
                continue;
            }

            const request = await getOrCreateCodeDiffRequest(
                templateNode,
                textEl.selector,
                templateToCodeChange,
            );
            request.textContent = textEl.content;
        }
    }

    private async getTemplateNodeForSelector(selector: string): Promise<TemplateNode | undefined> {
        return this.editorEngine.ast.getAnyTemplateNode(selector);
    }
}
