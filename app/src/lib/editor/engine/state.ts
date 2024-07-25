import { makeAutoObservable } from 'mobx';
import { WebViewElement } from '/common/models/element';

export class EditorElementState {
    private hoveredElement: WebViewElement | undefined;
    private selectedElements: WebViewElement[] = [];

    constructor() {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    setHoveredElement(element: WebViewElement) {
        this.hoveredElement = element;
    }

    clearHoveredElement() {
        this.hoveredElement = undefined;
    }

    addSelectedElement(element: WebViewElement) {
        this.selectedElements.push(element);
    }

    removeSelectedElement(element: WebViewElement) {
        this.selectedElements = this.selectedElements.filter(
            (el) => el.selector !== element.selector,
        );
    }

    clearSelectedElements() {
        this.selectedElements = [];
    }

    clear() {
        this.hoveredElement = undefined;
        this.selectedElements = [];
    }
}
