import { CssToTailwindTranslator } from 'css-to-tailwind-translator';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import { WebviewManager } from '../webview';
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

    async writeStyleToCode(): Promise<CodeResult[]> {
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);
        if (!stylesheet) throw new Error("No stylesheet found in the webview.");
        const tailwindResult = CssToTailwindTranslator(stylesheet);

        if (tailwindResult.code !== 'OK')
            throw new Error("Failed to translate CSS to Tailwind CSS.");

        const writeParams: WriteStyleParams[] = [];
        for (const res of tailwindResult.data) {
            const { resultVal, selectorName } = res;
            const dataOnlookId = await this.getDataOnlookId(selectorName, webview);
            const templateNode = this.decompress(dataOnlookId);
            const writeParam: WriteStyleParams = { selector: selectorName, templateNode, tailwind: resultVal };
            writeParams.push(writeParam);
        };

        const result = await window.Main.invoke(MainChannels.WRITE_STYLE_TO_CODE, writeParams);
        return result as CodeResult[];
    }
}
