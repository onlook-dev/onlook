import { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import { AstManager } from '../ast';

export class DomManager {
    private webviewToElement: Map<string, Element> = new Map();

    constructor(private ast: AstManager) {
        makeAutoObservable(this, {});
    }

    get elements() {
        return this.webviewToElement.values();
    }

    getDomElement(webviewId: string) {
        return this.webviewToElement.get(webviewId);
    }

    async setDom(webviewId: string, dom: Element) {
        this.ast.setMapRoot(dom);
        this.webviewToElement.set(webviewId, dom);
        this.webviewToElement = new Map(this.webviewToElement);
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
