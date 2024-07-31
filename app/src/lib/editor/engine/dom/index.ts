import { makeAutoObservable } from 'mobx';

export class DomManager {
    private webviewToElement: Map<string, Element> = new Map();

    constructor() {
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

    setDom(webviewId: string, dom: Element) {
        this.webviewToElement.set(webviewId, dom);
        this.webviewToElement = new Map(this.webviewToElement);
    }

    getElementBySelector(selector: string, webviewId: string) {
        const root = this.getDomElement(webviewId) as Element;
        const el = root.querySelector(selector);
        return el;
    }
}
