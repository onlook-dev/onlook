import { CodeManager } from "./code";
import { OverlayManager } from "./overlay";
import { EditorElementState } from "./state";
import { WebviewManager } from "./webview";
import { WebviewChannels } from "/common/constants";
import { ElementMetadata } from "/common/models";

export class EditorEngine {
    private elementState: EditorElementState = new EditorElementState();
    private overlayManager: OverlayManager = new OverlayManager();
    private webviewManager: WebviewManager = new WebviewManager();
    private codeManager: CodeManager = new CodeManager(this.webviewManager);

    get state() { return this.elementState; }
    get overlay() { return this.overlayManager; }
    get webviews() { return this.webviewManager; }
    get code() { return this.codeManager; }

    updateStyle(style: string, value: string) {
        this.state.selected.forEach((elementMetadata) => {
            const webview = this.webviews.get(elementMetadata.webviewId);
            if (!webview) return;
            webview.send(WebviewChannels.UPDATE_STYLE, { selector: elementMetadata.selector, style, value });
        });
    }

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
        this.clear();
        this.webviews.clear();
    }

    clear() {
        this.overlay.clear();
        this.state.clear();
    }

}
