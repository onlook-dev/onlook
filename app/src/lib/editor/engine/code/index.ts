import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { WebviewTag } from 'electron';
import { twMerge } from 'tailwind-merge';
import { AstManager } from '../ast';
import { WebviewManager } from '../webview';
import { EditorAttributes, MainChannels } from '/common/constants';
import { CodeChangeParam, CodeDiff } from '/common/models/code';
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
        const insertedEls = await this.getInsertedElements(webview);
        const codeChangeParams = await this.getCodeChangeParams(tailwindResults, insertedEls);
        const codeDiffs = (await this.getCodeDiff(codeChangeParams)) as CodeDiff[];

        // const insertParams = await this.getInsertChangeParams(insertedEls, tailwindResults);
        // const styleParams = await this.getStyleChangeParams(tailwindResults);
        // const insertedCodeDiffs = (await this.getInsertCodeDiff(insertParams)) as CodeDiff[];
        // const styleCodeDiffs = (await this.getStyleCodeDiff(styleParams)) as CodeDiff[];

        // return [...insertedCodeDiffs, ...styleCodeDiffs];
        return codeDiffs;
    }

    private getCodeDiff(params: CodeChangeParam[]): Promise<CodeDiff[]> {
        return window.api.invoke(MainChannels.GET_CODE_DIFFS, params);
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

    private async getCodeChangeParams(
        tailwindResults: ResultCode[],
        insertedEls: InsertedElement[],
    ): Promise<CodeChangeParam[]> {
        const templateToCodeChange: Map<TemplateNode, CodeChangeParam> = new Map();

        // Process tailwind changes
        for (const twRes of tailwindResults) {
            const { resultVal, selectorName: selector } = twRes;
            const templateNode =
                (await this.astManager.getInstance(selector)) ??
                (await this.astManager.getRoot(selector));
            if (!templateNode) {
                continue;
            }

            let changeParam = templateToCodeChange.get(templateNode);
            if (!changeParam) {
                const codeBlock = (await window.api.invoke(
                    MainChannels.GET_CODE_BLOCK,
                    templateNode,
                )) as string;
                changeParam = {
                    selector,
                    templateNode,
                    codeBlock,
                    elements: [],
                    attributes: {},
                };
                templateToCodeChange.set(templateNode, changeParam);
            }
            changeParam.attributes['className'] = twMerge(
                changeParam.attributes['className'] || '',
                resultVal,
            );
        }

        // Process inserted elements
        for (const insertedEl of insertedEls) {
            const targetSelector = insertedEl.location.targetSelector;
            const templateNode = await this.astManager.getRoot(targetSelector);
            if (!templateNode) {
                continue;
            }

            let changeParam = templateToCodeChange.get(templateNode);
            if (!changeParam) {
                const codeBlock = (await window.api.invoke(
                    MainChannels.GET_CODE_BLOCK,
                    templateNode,
                )) as string;
                changeParam = {
                    selector: targetSelector,
                    templateNode,
                    codeBlock,
                    elements: [],
                    attributes: {},
                };
                templateToCodeChange.set(templateNode, changeParam);
            }

            const insertedElWithTailwind = this.getInsertedElementWithTailwind(
                insertedEl,
                tailwindResults,
            );
            changeParam.elements.push(insertedElWithTailwind);
        }

        return Array.from(templateToCodeChange.values());
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
