import { makeAutoObservable } from 'mobx';
import { AstManager } from '../ast';

export class DomManager {
    private webviewToElement: Map<string, Element> = new Map();

    constructor(private ast: AstManager) {
        makeAutoObservable(this, {});
    }

    get map() {
        return this.webviewToElement;
    }

    get elements() {
        return this.webviewToElement.values();
    }

    getDomElement(webviewId: string) {
        return this.webviewToElement.get(webviewId);
    }

    async setDom(webviewId: string, dom: Element) {
        await this.ast.mapDom(dom);
        this.webviewToElement.set(webviewId, dom);
        this.webviewToElement = new Map(this.webviewToElement);
    }

    getElementBySelector(selector: string, webviewId: string) {
        const root = this.getDomElement(webviewId) as Element;
        const el = root.querySelector(selector);
        return el;
    }
}
