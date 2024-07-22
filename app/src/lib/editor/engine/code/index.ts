import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { twMerge } from 'tailwind-merge';
import { WebviewManager } from '../webviews';
import { EditorAttributes, MainChannels } from '/common/constants';
import { querySelectorCommand } from '/common/helpers';
import { decodeTemplateNode } from '/common/helpers/template';
import { CodeResult, TemplateNode, WriteStyleParams } from '/common/models';

export class CodeManager {
    constructor(private webviewManager: WebviewManager) {}

    viewInEditor(templateNode: TemplateNode) {
        window.api.invoke(MainChannels.OPEN_CODE_BLOCK, templateNode);
    }

    async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`,
        );
    }

    async getDataOnlookId(selector: string, webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(
            `${querySelectorCommand(selector)}?.getAttribute('${EditorAttributes.DATA_ONLOOK_ID}')`,
        );
    }

    async getTailwindClasses(stylesheet: string) {
        const tailwindResult = CssToTailwindTranslator(stylesheet);
        if (tailwindResult.code !== 'OK') {
            throw new Error('Failed to translate CSS to Tailwind CSS.');
        }
        return tailwindResult.data;
    }

    async getWriteStyleParams(tailwindResults: ResultCode[], webview: Electron.WebviewTag) {
        const writeParams: Map<string, WriteStyleParams> = new Map();
        for (const twRes of tailwindResults) {
            const { resultVal, selectorName } = twRes;
            const dataOnlookId = await this.getDataOnlookId(selectorName, webview);
            if (!dataOnlookId) {
                continue;
            }

            let writeParam = writeParams.get(dataOnlookId);
            if (!writeParam) {
                writeParam = {
                    selector: selectorName,
                    templateNode: decodeTemplateNode(dataOnlookId),
                    tailwind: resultVal,
                };
            } else {
                writeParam.tailwind = twMerge(writeParam.tailwind, resultVal);
            }

            writeParams.set(dataOnlookId, writeParam);
        }

        return Array.from(writeParams.values());
    }

    async generateCodeDiffs(): Promise<CodeResult[]> {
        // TODO: Handle multiple webviews
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);

        if (!stylesheet) {
            console.log('No stylesheet found in the webview.');
            return [];
        }

        const tailwindResults = await this.getTailwindClasses(stylesheet);
        const writeParams = await this.getWriteStyleParams(tailwindResults, webview);
        const result = await window.api.invoke(MainChannels.GET_STYLE_CODE, writeParams);

        return (result || []) as CodeResult[];
    }
}
