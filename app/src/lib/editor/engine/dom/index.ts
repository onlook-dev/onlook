import { makeAutoObservable } from 'mobx';

export class DomManager {
    private domMap: Map<string, Element> = new Map();

    constructor() {
        makeAutoObservable(this, {});
    }

    get map() {
        return this.domMap;
    }

    get elements() {
        return this.domMap.values();
    }

    setDom(id: string, dom: Element) {
        this.domMap.set(id, dom);
        this.domMap = new Map(this.domMap);
    }
}
