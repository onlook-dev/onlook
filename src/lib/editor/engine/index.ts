import { OverlayManager } from "./overlay";
import { EditorElementState } from "./state";
import { ElementMetadata } from "/common/models";

export class EditorEngine {
    private elementState: EditorElementState = new EditorElementState();
    private overlayManager: OverlayManager = new OverlayManager();

    get state() { return this.elementState; }
    get overlay() { return this.overlayManager; }

    mouseover(elementMetadata: ElementMetadata, webview: Electron.WebviewTag) {
        const adjustedRect = this.overlay.adaptRectFromSourceElement(elementMetadata.rect, webview);
        this.overlay.updateHoverRect(adjustedRect);
        this.state.setHoveredElement(elementMetadata);
    }

    click(elementMetadata: ElementMetadata, webview: Electron.WebviewTag) {
        const adjustedRect = this.overlay.adaptRectFromSourceElement(elementMetadata.rect, webview);
        this.overlay.removeClickedRects();
        this.overlay.addClickRect(adjustedRect, elementMetadata.computedStyle);
        this.state.clearSelectedElements();
        this.state.addSelectedElement(elementMetadata);
    }

    scroll(webview: Electron.WebviewTag) {
        this.overlay.clear();
        const clickedElements = this.state.selected;
        clickedElements.forEach(async (element) => {
            const rect = await this.overlay.getBoundingRect(element.selector, webview);
            const computedStyle = await this.overlay.getComputedStyle(element.selector, webview);
            const adjustedRect = this.overlay.adaptRectFromSourceElement(rect, webview);
            this.overlay.addClickRect(adjustedRect, computedStyle);
        });
    }

    dispose() {
        this.overlay.clear();
    }
}
