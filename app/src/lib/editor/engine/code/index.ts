import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { WebviewTag } from 'electron';
import { twMerge } from 'tailwind-merge';
import { AstManager } from '../ast';
import { WebviewManager } from '../webview';
import { EditorAttributes, MainChannels } from '/common/constants';
import { CodeDiff, InsertChangeParam, StyleChangeParam } from '/common/models';
import { InsertedElement } from '/common/models/element/insert';
import { TemplateNode } from '/common/models/element/templateNode';

export class CodeManager {
    constructor(
        private webviewManager: WebviewManager,
        private astManager: AstManager,
    ) {}

    viewSource(templateNode: TemplateNode) {
        window.api.invoke(MainChannels.VIEW_SOURCE_CODE, templateNode);
    }

    async generateCodeDiffs(): Promise<CodeDiff[]> {
        const webviews = [...this.webviewManager.getAll().values()];
        if (webviews.length === 0) {
            console.log('No webviews found.');
            return [];
        }
        const webview = webviews[0];
        const tailwindResults = await this.getTailwindClasses(webview);
        const insertedCodeDiffs = await this.generateInsertedCodeDiffs(webview, tailwindResults);
        const styleCodeDiffs = await this.generateStyleCodeDiffs(tailwindResults);
        return [...insertedCodeDiffs, ...styleCodeDiffs];
    }

    async generateInsertedCodeDiffs(
        webview: WebviewTag,
        tailwindResults: ResultCode[],
    ): Promise<CodeDiff[]> {
        /***
         * TODO:
         *  Handle overwriting styles. Should consolidate into 1 change for each template node.
         *  For example: Style an element, then insert an element inside it. The style is currently overwritten.
         */
        const insertedEls = await this.getInsertedElements(webview);
        const writeParams = await this.getInsertChangeParams(insertedEls, tailwindResults);
        const insertedCodeDiffs = (await this.getInsertCodeDiff(writeParams)) as CodeDiff[];
        return insertedCodeDiffs;
    }

    async generateStyleCodeDiffs(tailwindResults: ResultCode[]): Promise<CodeDiff[]> {
        const writeParams = await this.getStyleChangeParams(tailwindResults);
        const styleCodeDiffs = (await this.getStyleCodeDiff(writeParams)) as CodeDiff[];
        return styleCodeDiffs;
    }

    private getStyleCodeDiff(styleParams: StyleChangeParam[]): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_STYLE_CODE_DIFFS, styleParams);
    }

    private getInsertCodeDiff(insertParams: InsertChangeParam[]): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_INSERT_CODE_DIFFS, insertParams);
    }

    private async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`,
        );
    }

    private async getInsertedElements(webview: Electron.WebviewTag): Promise<InsertedElement[]> {
        return webview.executeJavaScript(`window.api?.getInsertedElements()`);
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

    private async getStyleChangeParams(tailwindResults: ResultCode[]): Promise<StyleChangeParam[]> {
        const templateToStyleChange: Map<TemplateNode, StyleChangeParam> = new Map();
        for (const twRes of tailwindResults) {
            const { resultVal, selectorName: selector } = twRes;
            const templateNode =
                (await this.astManager.getInstance(selector)) ??
                (await this.astManager.getRoot(selector));
            if (!templateNode) {
                continue;
            }

            let writeParam = templateToStyleChange.get(templateNode);
            if (!writeParam) {
                const codeBlock = (await window.api.invoke(
                    MainChannels.GET_CODE_BLOCK,
                    templateNode,
                )) as string;
                writeParam = {
                    selector,
                    templateNode: templateNode,
                    tailwind: resultVal,
                    codeBlock,
                };
            } else {
                writeParam.tailwind = twMerge(writeParam.tailwind, resultVal);
            }
            templateToStyleChange.set(templateNode, writeParam);
        }

        return Array.from(templateToStyleChange.values());
    }

    private async getInsertChangeParams(
        insertedEls: InsertedElement[],
        tailwindResults: ResultCode[],
    ): Promise<InsertChangeParam[]> {
        const templateToInsertChange: Map<TemplateNode, InsertChangeParam> = new Map();

        for (const insertedEl of insertedEls) {
            const targetSelector = insertedEl.location.targetSelector;
            const templateNode = await this.astManager.getRoot(targetSelector);
            if (!templateNode) {
                continue;
            }

            let writeParam = templateToInsertChange.get(templateNode);
            if (!writeParam) {
                const codeBlock = (await window.api.invoke(
                    MainChannels.GET_CODE_BLOCK,
                    templateNode,
                )) as string;

                const insertedElWithTailwind = this.getInsertedElementWithTailwind(
                    insertedEl,
                    tailwindResults,
                );
                writeParam = {
                    templateNode: templateNode,
                    codeBlock,
                    element: insertedElWithTailwind,
                };
            }
            templateToInsertChange.set(templateNode, writeParam);
        }
        return Array.from(templateToInsertChange.values());
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
}
