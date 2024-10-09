import { assertNever, sendAnalytics } from '@/lib/utils';
import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import { twMerge } from 'tailwind-merge';
import { EditorEngine } from '..';
import { Action, StyleActionTarget } from '/common/actions';
import { EditorAttributes, MainChannels, WebviewChannels } from '/common/constants';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import {
    InsertedElement,
    MovedElement,
    StyleChange,
    TextEditedElement,
} from '/common/models/element/domAction';
import { TemplateNode } from '/common/models/element/templateNode';

export class CodeManager {
    isExecuting = false;
    isQueued = false;

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

    write(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.writeStyle(action.targets, action.style);
                break;
            case 'insert-element':
                break;
            case 'move-element':
                break;
            case 'remove-element':
                break;
            case 'edit-text':
                break;
            default:
                assertNever(action);
        }
        sendAnalytics('write code');
    }

    async generateAndWriteCodeDiffs(): Promise<void> {
        if (this.isExecuting) {
            this.isQueued = true;
            return;
        }
        this.isExecuting = true;
        const codeDiffs = await this.generateCodeDiffs();
        if (codeDiffs.length === 0) {
            console.error('No code diffs found.');
            this.isExecuting = false;
            if (this.isQueued) {
                this.isQueued = false;
                this.generateAndWriteCodeDiffs();
            }
            return;
        }
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            this.editorEngine.webviews.getAll().forEach((webview) => {
                webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
            });
        }
        sendAnalytics('write code');
        this.isExecuting = false;
        if (this.isQueued) {
            this.isQueued = false;
            this.generateAndWriteCodeDiffs();
        }
    }

    async generateCodeDiffs(): Promise<CodeDiff[]> {
        return [];
        // const webviews = [...this.editorEngine.webviews.getAll().values()];
        // if (webviews.length === 0) {
        //     console.error('No webviews found.');
        //     return [];
        // }
        // const webview = webviews[0];

        // const tailwindResults = await this.getTailwindClasses(webview);
        // const insertedEls = await this.getInsertedElements(webview);
        // const movedEls = await this.getMovedElements(webview);
        // const textEditEls = await this.getTextEditElements(webview);

        // const codeDiffRequest = await this.getCodeDiffRequests(
        //     tailwindResults,
        //     insertedEls,
        //     movedEls,
        //     textEditEls,
        // );
        // const codeDiffs = await this.getCodeDiff(codeDiffRequest);
        // return codeDiffs;
    }

    async writeStyle(targets: Array<StyleActionTarget>, style: string) {
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
    }

    private async getTailwindClasses(webview: WebviewTag) {
        const stylesheet = await this.getStylesheet(webview);
        if (!stylesheet) {
            console.log('No stylesheet found in the webview.');
            return [];
        }
        const tailwindResult = CssToTailwindTranslator(stylesheet);
        if (tailwindResult.code !== 'OK') {
            throw new Error('Failed to translate CSS to Tailwind CSS.');
        }
        return tailwindResult.data;
    }

    private async getInsertedElements(webview: Electron.WebviewTag): Promise<InsertedElement[]> {
        return webview.executeJavaScript(`window.api?.getInsertedElements()`) || [];
    }

    private async getMovedElements(webview: Electron.WebviewTag): Promise<MovedElement[]> {
        return webview.executeJavaScript(`window.api?.getMovedElements()`) || [];
    }

    private async getTextEditElements(webview: Electron.WebviewTag): Promise<TextEditedElement[]> {
        return webview.executeJavaScript(`window.api?.getTextEditedElements()`) || [];
    }

    private async getCodeDiffRequests(
        styleChanges: StyleChange[],
        insertedEls: InsertedElement[],
        movedEls: MovedElement[],
        textEditEls: TextEditedElement[],
    ): Promise<Map<TemplateNode, CodeDiffRequest>> {
        const templateToRequest = new Map<TemplateNode, CodeDiffRequest>();
        await this.processStyleChanges(styleChanges, templateToRequest);
        // await this.processInsertedElements(insertedEls, styleChanges, templateToRequest);
        await this.processMovedElements(movedEls, templateToRequest);
        await this.processTextEditElements(textEditEls, templateToRequest);
        return templateToRequest;
    }

    getCodeDiff(templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_CODE_DIFFS, templateToCodeDiff);
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

            // TODO: This can be generalized to any CSS
            this.getTailwindClassChangeFromStyle(request, change.styles);
        }
    }

    private async processInsertedElements(
        insertedEls: InsertedElement[],
        tailwindResults: ResultCode[],
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
            const insertedElWithTailwind = this.getInsertedElementWithTailwind(
                insertedEl,
                tailwindResults,
            );
            request.insertedElements.push(insertedElWithTailwind);
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
        const css = this.createCSSRuleString(request.selector, styles);
        const tw = CssToTailwindTranslator(css);
        const newClasses = tw.data.map((res) => res.resultVal);
        request.attributes['className'] = twMerge(
            request.attributes['className'] || '',
            newClasses,
        );
        console.log(request.attributes);
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

    private getInsertedElementWithTailwind(
        el: InsertedElement,
        tailwindResults: ResultCode[],
    ): InsertedElement {
        const tailwind = tailwindResults.find((twRes) => twRes.selectorName === el.selector);
        if (!tailwind) {
            return el;
        }
        const attributes = { ...el.attributes, className: tailwind.resultVal };
        const children = el.children.map((child) =>
            this.getInsertedElementWithTailwind(child as InsertedElement, tailwindResults),
        );
        const newEl = { ...el, attributes, children };
        return newEl;
    }

    private async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`,
        );
    }
}
