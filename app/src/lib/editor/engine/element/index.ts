import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { OverlayManager } from '../overlay';
import { DomElement, WebViewElement } from '/common/models/element';

export class ElementManager {
    private hoveredElement: WebViewElement | undefined;
    private selectedElements: WebViewElement[] = [];

    constructor(private overlay: OverlayManager) {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    mouseover(domEl: DomElement, webview: Electron.WebviewTag) {
        if (!domEl) {
            this.overlay.removeHoverRect();
            this.clearHoveredElement();
            return;
        }
        if (this.hoveredElement && this.hoveredElement.selector === domEl.selector) {
            return;
        }

        const webviewEl: WebViewElement = {
            ...domEl,
            webviewId: webview.id,
        };
        const adjustedRect = this.overlay.adaptRectFromSourceElement(webviewEl.rect, webview);
        this.overlay.updateHoverRect(adjustedRect);
        this.setHoveredElement(webviewEl);
    }

    click(domEls: DomElement[], webview: Electron.WebviewTag) {
        this.overlay.removeClickedRects();
        this.clearSelectedElements();

        const webviewEls: WebViewElement[] = domEls.map((el) => {
            const webviewElement: WebViewElement = {
                ...el,
                webviewId: webview.id,
            };
            return webviewElement;
        });

        for (const webviewEl of webviewEls) {
            const adjustedRect = this.overlay.adaptRectFromSourceElement(webviewEl.rect, webview);
            this.overlay.addClickRect(adjustedRect, webviewEl.styles);
            this.addSelectedElement(webviewEl);
        }
    }

    refreshSelectedElements(webview: Electron.WebviewTag) {
        this.debouncedRefreshClickedElements(webview);
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

    clearSelectedElement(element: WebViewElement) {
        this.selectedElements = this.selectedElements.filter(
            (el) => el.selector !== element.selector,
        );
    }

    clear() {
        this.hoveredElement = undefined;
        this.selectedElements = [];
    }

    private clearSelectedElements() {
        this.selectedElements = [];
    }

    private async undebouncedRefreshClickedElements(webview: Electron.WebviewTag) {
        const clickedElements = this.selected;
        const newClickedRects: { adjustedRect: DOMRect; computedStyle: CSSStyleDeclaration }[] = [];

        for (const element of clickedElements) {
            const rect = await this.overlay.getBoundingRect(element.selector, webview);
            const computedStyle = await this.overlay.getComputedStyle(element.selector, webview);
            const adjustedRect = this.overlay.adaptRectFromSourceElement(rect, webview);
            newClickedRects.push({ adjustedRect, computedStyle });
        }

        this.overlay.clear();
        newClickedRects.forEach(({ adjustedRect, computedStyle }) => {
            this.overlay.addClickRect(adjustedRect, computedStyle);
        });
    }
    private debouncedRefreshClickedElements = debounce(this.undebouncedRefreshClickedElements, 10);
}
