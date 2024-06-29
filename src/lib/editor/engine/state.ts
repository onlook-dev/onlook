import { makeAutoObservable } from "mobx";
import { ElementMetadata } from "/common/models";

export class EditorElementState {
    private hoveredElement: ElementMetadata | undefined
    private selectedElements: ElementMetadata[] = []

    constructor() {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    setHoveredElement(element: ElementMetadata) {
        this.hoveredElement = element;
    }

    addSelectedElement(element: ElementMetadata) {
        this.selectedElements.push(element);
    }

    removeSelectedElement(element: ElementMetadata) {
        this.selectedElements = this.selectedElements.filter((el) => el.selector !== element.selector);
    }

    clearSelectedElements() {
        this.selectedElements = [];
    }
}