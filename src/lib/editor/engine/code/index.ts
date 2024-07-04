import { CssToTailwindTranslator, ResultCode } from 'css-to-tailwind-translator';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import { twMerge } from 'tailwind-merge';
import { WebviewManager } from '../webviews';
import { EditorAttributes, MainChannels } from '/common/constants';
import { querySelectorCommand } from '/common/helpers';
import { CodeResult, TemplateNode, WriteStyleParams } from '/common/models';

export class CodeManager {
    constructor(private webviewManager: WebviewManager) { }

    compress(templateNode: TemplateNode) {
        const buffer = strToU8(JSON.stringify(templateNode));
        const compressed = compressSync(buffer);
        const binaryString = Array.from(new Uint8Array(compressed)).map(byte => String.fromCharCode(byte)).join('');
        const base64 = btoa(binaryString);
        return base64;
    }

    decompress(base64: string): TemplateNode {
        const buffer = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
        const decompressed = decompressSync(buffer);
        const JsonString = strFromU8(decompressed);
        const templateNode = JSON.parse(JsonString) as TemplateNode;
        return templateNode
    }

    viewInEditor(templateNode: TemplateNode) {
        window.Main.invoke(MainChannels.OPEN_CODE_BLOCK, templateNode);
    }

    async getStylesheet(webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(`document.getElementById('${EditorAttributes.ONLOOK_STYLESHEET_ID}')?.textContent`)
    }

    async getDataOnlookId(selector: string, webview: Electron.WebviewTag) {
        return await webview.executeJavaScript(`${querySelectorCommand(selector)}?.getAttribute('${EditorAttributes.DATA_ONLOOK_ID}')`);
    }

    async getTailwindClasses(stylesheet: string) {
        const tailwindResult = CssToTailwindTranslator(stylesheet);
        if (tailwindResult.code !== 'OK')
            throw new Error("Failed to translate CSS to Tailwind CSS.");
        return tailwindResult.data;
    }

    async getWriteStyleParams(tailwindResults: ResultCode[], webview: Electron.WebviewTag) {
        const writeParams: Map<string, WriteStyleParams> = new Map();
        for (const twRes of tailwindResults) {
            const { resultVal, selectorName } = twRes;
            const dataOnlookId = await this.getDataOnlookId(selectorName, webview);
            if (!dataOnlookId) continue;

            let writeParam = writeParams.get(dataOnlookId);
            if (!writeParam) {
                writeParam = { selector: selectorName, templateNode: this.decompress(dataOnlookId), tailwind: resultVal };
            } else {
                writeParam.tailwind = twMerge(writeParam.tailwind, resultVal);
            }

            writeParams.set(dataOnlookId, writeParam);
        };

        return Array.from(writeParams.values())
    }

    async generateCodeDiffs(): Promise<CodeResult[]> {
        // TODO: Handle multiple webviews
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);

        if (!stylesheet) {
            console.log("No stylesheet found in the webview.");
            return [];
        }

        const tailwindResults = await this.getTailwindClasses(stylesheet);
        const writeParams = await this.getWriteStyleParams(tailwindResults, webview);
        const result = await window.Main.invoke(MainChannels.GET_STYLE_CODE, writeParams);

        return (result || []) as CodeResult[];
    }
}
