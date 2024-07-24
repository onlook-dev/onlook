import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { twMerge } from 'tailwind-merge';
import { TemplateNode } from '../../../../../common/models/element/templateNode';
import { WebviewManager } from '../webviews';
import { EditorAttributes, MainChannels } from '/common/constants';
import { querySelectorCommand } from '/common/helpers';
import { decodeTemplateNode } from '/common/helpers/template';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';

export class CodeManager {
    constructor(private webviewManager: WebviewManager) {}

    viewSource(templateNode: TemplateNode) {
        window.api.invoke(MainChannels.VIEW_CODE_BLOCK, templateNode);
    }

    async generateCodeDiffs(): Promise<StyleCodeDiff[]> {
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);

        if (!stylesheet) {
            console.log('No stylesheet found in the webview.');
            return [];
        }

        const tailwindResults = await this.getTailwindClasses(stylesheet);
        const writeParams = await this.getStyleChangeParams(tailwindResults, webview);
        const styleCodeDiffs = (await this.getStyleCodeDiff(writeParams)) as StyleCodeDiff[];
        return styleCodeDiffs;
    }

    private getStyleCodeDiff(styleParams: StyleChangeParam[]): Promise<StyleCodeDiff[]> {
        return window.api.invoke(MainChannels.GET_STYLE_CODE_DIFF, styleParams);
    }

    private async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`,
        );
    }

    private async getDataOnlookId(selector: string, webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `${querySelectorCommand(selector)}?.getAttribute('${EditorAttributes.DATA_ONLOOK_ID}')`,
        );
    }

    private async getTailwindClasses(stylesheet: string) {
        const tailwindResult = CssToTailwindTranslator(stylesheet);
        if (tailwindResult.code !== 'OK') {
            throw new Error('Failed to translate CSS to Tailwind CSS.');
        }
        return tailwindResult.data;
    }

    private async getStyleChangeParams(
        tailwindResults: ResultCode[],
        webview: Electron.WebviewTag,
    ): Promise<StyleChangeParam[]> {
        const changeParams: Map<string, StyleChangeParam> = new Map();
        for (const twRes of tailwindResults) {
            const { resultVal, selectorName } = twRes;
            const dataOnlookId = await this.getDataOnlookId(selectorName, webview);
            if (!dataOnlookId) {
                continue;
            }

            let writeParam = changeParams.get(dataOnlookId);
            if (!writeParam) {
                const templateNode = decodeTemplateNode(dataOnlookId);
                const codeBlock = (await window.api.invoke(
                    MainChannels.GET_CODE_BLOCK,
                    templateNode,
                )) as string;
                writeParam = {
                    selector: selectorName,
                    templateNode: decodeTemplateNode(dataOnlookId),
                    tailwind: resultVal,
                    codeBlock,
                };
            } else {
                writeParam.tailwind = twMerge(writeParam.tailwind, resultVal);
            }

            changeParams.set(dataOnlookId, writeParam);
        }

        return Array.from(changeParams.values());
    }
}
