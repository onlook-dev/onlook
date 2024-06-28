import { OverlayManager } from "./overlay";
import { EditorElementState } from "./state";
import { ElementMetadata } from "/common/models";

export class EditorEngine {
    private elementState: EditorElementState = new EditorElementState();
    private overlayManager: OverlayManager = new OverlayManager();

    get state() {
        return this.elementState;
    }
    get overlay() {
        return this.overlayManager;
    }

    mouseover(elementMetadata: ElementMetadata, webview: Electron.WebviewTag) {
        const adjustedRect = this.overlay.adaptRectFromSourceElement(elementMetadata.rect, webview);
        this.overlay.updateHoverRect(adjustedRect);
        this.state.setHoveredElement(elementMetadata.selector);
    }

    click(elementMetadata: ElementMetadata, webview: Electron.WebviewTag) {
        const adjustedRect = this.overlay.adaptRectFromSourceElement(elementMetadata.rect, webview);
        this.overlay.removeClickedRects();
        this.overlay.addClickRect(adjustedRect, elementMetadata.computedStyle);
        this.state.clearSelectedElements();
        this.state.addSelectedElement(elementMetadata.selector);
    }

    scroll(webview: Electron.WebviewTag) {
        this.overlay.clear();
        const clickedSelectors = this.state.selected;
        clickedSelectors.forEach(async (selector) => {
            const rect = await this.overlay.getRectFromSelector(selector, webview);
            const computedStyle = await this.overlay.getComputedStyleFromSelector(selector, webview);
            const adjustedRect = this.overlay.adaptRectFromSourceElement(rect, webview);
            this.overlay.addClickRect(adjustedRect, computedStyle);
        });
    }
}
