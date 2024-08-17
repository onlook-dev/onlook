import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { twMerge } from 'tailwind-merge';
import { AstManager } from '../ast';
import { WebviewManager } from '../webview';
import { EditorAttributes, MainChannels } from '/common/constants';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';
import { TemplateNode } from '/common/models/element/templateNode';

export class CodeManager {
    constructor(
        private webviewManager: WebviewManager,
        private astManager: AstManager,
    ) {}

    viewSource(templateNode: TemplateNode) {
        window.api.invoke(MainChannels.VIEW_SOURCE_CODE, templateNode);
    }

    async generateCodeDiffs(): Promise<StyleCodeDiff[]> {
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);
        if (!stylesheet) {
            console.log('No stylesheet found in the webview.');
            return [];
        }

        const tailwindResults = await this.getTailwindClasses(stylesheet);
        const writeParams = await this.getStyleChangeParams(tailwindResults);
        const styleCodeDiffs = (await this.getStyleCodeDiff(writeParams)) as StyleCodeDiff[];
        return styleCodeDiffs;
    }

    private getStyleCodeDiff(styleParams: StyleChangeParam[]): Promise<StyleCodeDiff[]> {
        return window.api.invoke(MainChannels.GET_STYLE_CODE_DIFFS, styleParams);
    }

    private async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`,
        );
    }

    private async getTailwindClasses(stylesheet: string) {
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
}
