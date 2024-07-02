import { TemplateNode } from '@/lib/models';
import { CssToTailwindTranslator } from 'css-to-tailwind-translator';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import { WebviewManager } from '../webview';
import { EditorAttributes, MainChannels } from '/common/constants';
import { WriteStyleParams } from '/common/models';

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
        return await webview.executeJavaScript(`document.querySelector('${selector}')?.getAttribute('${EditorAttributes.DATA_ONLOOK_ID}')`);
    }

    async writeStyleToCode() {
        const webview = [...this.webviewManager.getAll().values()][0];
        const stylesheet = await this.getStylesheet(webview);
        const tailwindResult = CssToTailwindTranslator(stylesheet);

        console.log(tailwindResult);
        if (tailwindResult.code !== 'OK')
            throw new Error("Failed to translate CSS to Tailwind CSS.");

        tailwindResult.data.forEach(async (res) => {
            const { resultVal, selectorName } = res;
            const dataOnlookId = await this.getDataOnlookId(selectorName, webview);
            const writeParam: WriteStyleParams = { selector: selectorName, dataOnlookId, tailwind: resultVal };
            console.log(writeParam);
        });
    }
}
