import type { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class DomManager {
    private webviewToRootElement: Map<string, Element> = new Map();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get elements() {
        return this.webviewToRootElement.values();
    }

    getDomElement(webviewId: string) {
        return this.webviewToRootElement.get(webviewId);
    }

    setDom(webviewId: string, root: Element) {
        this.editorEngine.ast.setMapRoot(webviewId, root);
        this.webviewToRootElement.set(webviewId, root);
        this.webviewToRootElement = new Map(this.webviewToRootElement);
    }

    async refreshDom(webview: WebviewTag) {
        const root = await this.getBodyFromWebview(webview);
        this.setDom(webview.id, root);
    }

    async refreshAstDoc(webview: WebviewTag) {
        const root = await this.getBodyFromWebview(webview);
        this.editorEngine.ast.setDoc(webview.id, root.ownerDocument);
    }

    getElementBySelector(selector: string, webviewId: string) {
        const root = this.getDomElement(webviewId) as Element;
        const el = root.querySelector(selector);
        return el;
    }

    async getBodyFromWebview(webview: WebviewTag) {
        const htmlString = await webview.executeJavaScript('document.documentElement.outerHTML');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const rootNode = doc.body;
        return rootNode;
    }
}
