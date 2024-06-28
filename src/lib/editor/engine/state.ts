export class EditorElementState {
    private hoveredElement: string | undefined
    private selectedElements: string[] = []

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    setHoveredElement(selector: string) {
        this.hoveredElement = selector;
    }

    addSelectedElement(selector: string) {
        this.selectedElements.push(selector);
    }

    removeSelectedElement(selector: string) {
        this.selectedElements = this.selectedElements.filter((el) => el !== selector);
    }

    clearSelectedElements() {
        this.selectedElements = [];
    }
}