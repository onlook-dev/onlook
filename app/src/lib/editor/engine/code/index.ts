import { assertNever, sendAnalytics } from '@/lib/utils';
import { CssToTailwindTranslator } from 'css-to-tailwind-translator';
import { makeAutoObservable } from 'mobx';
import { twMerge } from 'tailwind-merge';
import { EditorEngine } from '..';
import {
    Action,
    ActionElement,
    ActionElementLocation,
    EditTextAction,
    InsertElementAction,
    MoveElementAction,
    UpdateStyleAction,
} from '/common/actions';
import { MainChannels, WebviewChannels } from '/common/constants';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import {
    DomActionType,
    InsertedElement,
    MovedElement,
    StyleChange,
    TextEditedElement,
} from '/common/models/element/domAction';
import { TemplateNode } from '/common/models/element/templateNode';

export class CodeManager {
    isExecuting = false;
    private moveCleanDebounceTimer: Timer | null = null;
    private queuedMoveFilesToClean: Set<string> = new Set();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    viewSource(templateNode?: TemplateNode): void {
        if (!templateNode) {
            console.error('No template node found.');
            return;
        }
        window.api.invoke(MainChannels.VIEW_SOURCE_CODE, templateNode);
        sendAnalytics('view source code');
    }

    async write(action: Action) {
        // TODO: Should queue writes if isExecuting to prevent overwrite
        this.isExecuting = true;
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
                // TODO: Implement
                break;
            case 'edit-text':
                await this.writeEditText(action);
                break;
            default:
                assertNever(action);
        }
        this.isExecuting = false;
        sendAnalytics('write code');
    }

    async writeStyle({ targets, style }: UpdateStyleAction) {
        const styleChanges: StyleChange[] = [];
        targets.map((target) => {
            styleChanges.push({
                selector: target.selector,
                styles: {
                    [style]: target.change.updated,
                },
            });
        });

        const codeDiffRequest = await this.getCodeDiffRequests(styleChanges, [], [], []);
        const codeDiffs = await this.getCodeDiff(codeDiffRequest);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            this.editorEngine.webviews.getAll().forEach((webview) => {
                webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
            });
        }
    }

    async writeInsert({ location, element, styles }: InsertElementAction) {
        const insertedElement = this.getInsertedElement(element, location, styles);
        const codeDiffRequest = await this.getCodeDiffRequests([], [insertedElement], [], []);
        const codeDiffs = await this.getCodeDiff(codeDiffRequest);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            this.editorEngine.webviews.getAll().forEach((webview) => {
                webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
            });
        }
    }

    private async writeMove({ targets, location }: MoveElementAction) {
        const movedElements: MovedElement[] = [];

        for (const target of targets) {
            movedElements.push({
                type: DomActionType.MOVE,
                location: location,
                selector: target.selector,
            });
        }

        const codeDiffRequest = await this.getCodeDiffRequests([], [], movedElements, []);
        const codeDiffs = await this.getCodeDiff(codeDiffRequest);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            this.editorEngine.webviews.getAll().forEach((webview) => {
                webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
            });

            codeDiffs.forEach((diff) => this.queuedMoveFilesToClean.add(diff.path));
            this.debounceMoveCleanup();
        }
    }

    private async writeEditText({ targets, newContent }: EditTextAction) {
        const textEditElements: TextEditedElement[] = [];

        for (const target of targets) {
            textEditElements.push({
                selector: target.selector,
                content: newContent,
            });
        }

        const codeDiffRequest = await this.getCodeDiffRequests([], [], [], textEditElements);
        const codeDiffs = await this.getCodeDiff(codeDiffRequest);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            this.editorEngine.webviews.getAll().forEach((webview) => {
                webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
            });
        }
    }

    private getInsertedElement(
        actionElement: ActionElement,
        location: ActionElementLocation,
        styles: Record<string, string>,
    ): InsertedElement {
        const insertedElement: InsertedElement = {
            type: DomActionType.INSERT,
            tagName: actionElement.tagName,
            children: [],
            attributes: { className: actionElement.attributes['className'] || '' },
            textContent: actionElement.textContent,
            location,
        };

        // Update classname from style
        const newClasses = this.getCssClasses(insertedElement.location.targetSelector, styles);
        insertedElement.attributes['className'] = twMerge(
            insertedElement.attributes['className'] || '',
            newClasses,
        );

        if (actionElement.children) {
            insertedElement.children = actionElement.children.map((child) =>
                this.getInsertedElement(child, location, styles),
            );
        }
        return insertedElement;
    }

    private async getCodeDiffRequests(
        styleChanges: StyleChange[],
        insertedEls: InsertedElement[],
        movedEls: MovedElement[],
        textEditEls: TextEditedElement[],
    ): Promise<Map<TemplateNode, CodeDiffRequest>> {
        const templateToRequest = new Map<TemplateNode, CodeDiffRequest>();
        await this.processStyleChanges(styleChanges, templateToRequest);
        await this.processInsertedElements(insertedEls, templateToRequest);
        await this.processMovedElements(movedEls, templateToRequest);
        await this.processTextEditElements(textEditEls, templateToRequest);
        return templateToRequest;
    }

    getCodeDiff(templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_CODE_DIFFS, templateToCodeDiff);
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
        }, 5000);
    }

    private async processStyleChanges(
        styleChanges: StyleChange[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const change of styleChanges) {
            const templateNode = await this.getTemplateNodeForSelector(change.selector);
            if (!templateNode) {
                continue;
            }

            const request = await this.getOrCreateCodeDiffRequest(
                templateNode,
                change.selector,
                templateToCodeChange,
            );
            this.getTailwindClassChangeFromStyle(request, change.styles);
        }
    }

    private async processInsertedElements(
        insertedEls: InsertedElement[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const insertedEl of insertedEls) {
            const targetTemplateNode = await this.getTemplateNodeForSelector(
                insertedEl.location.targetSelector,
            );
            if (!targetTemplateNode) {
                continue;
            }

            const request = await this.getOrCreateCodeDiffRequest(
                targetTemplateNode,
                insertedEl.location.targetSelector,
                templateToCodeChange,
            );
            request.insertedElements.push(insertedEl);
        }
    }

    private async processMovedElements(
        movedEls: MovedElement[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<void> {
        for (const movedEl of movedEls) {
            const parentTemplateNode = await this.getTemplateNodeForSelector(
                movedEl.location.targetSelector,
            );
            if (!parentTemplateNode) {
                continue;
            }

            const request = await this.getOrCreateCodeDiffRequest(
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
        textEditEls: TextEditedElement[],
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ) {
        for (const textEl of textEditEls) {
            const templateNode = await this.getTemplateNodeForSelector(textEl.selector);
            if (!templateNode) {
                continue;
            }

            const request = await this.getOrCreateCodeDiffRequest(
                templateNode,
                textEl.selector,
                templateToCodeChange,
            );
            request.textContent = textEl.content;
        }
    }

    private async getTemplateNodeForSelector(selector: string): Promise<TemplateNode | undefined> {
        return (
            this.editorEngine.ast.getInstance(selector) ?? this.editorEngine.ast.getRoot(selector)
        );
    }

    private async getOrCreateCodeDiffRequest(
        templateNode: TemplateNode,
        selector: string,
        templateToCodeChange: Map<TemplateNode, CodeDiffRequest>,
    ): Promise<CodeDiffRequest> {
        let diffRequest = templateToCodeChange.get(templateNode);
        if (!diffRequest) {
            diffRequest = {
                selector,
                templateNode,
                insertedElements: [],
                movedElements: [],
                attributes: {},
            };
            templateToCodeChange.set(templateNode, diffRequest);
        }
        return diffRequest;
    }

    private getTailwindClassChangeFromStyle(
        request: CodeDiffRequest,
        styles: Record<string, string>,
    ): void {
        const newClasses = this.getCssClasses(request.selector, styles);
        request.attributes['className'] = twMerge(
            request.attributes['className'] || '',
            newClasses,
        );
    }

    getCssClasses(selector: string, styles: Record<string, string>) {
        const css = this.createCSSRuleString(selector, styles);
        const tw = CssToTailwindTranslator(css);
        return tw.data.map((res) => res.resultVal);
    }

    createCSSRuleString(selector: string, styles: Record<string, string>) {
        const cssString = Object.entries(styles)
            .map(
                ([property, value]) =>
                    `${property.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`,
            )
            .join(' ');
        return `${selector} { ${cssString} }`;
    }
}
