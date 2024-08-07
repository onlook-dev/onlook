import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { OverlayManager } from '../overlay';
import { WebViewElement } from '/common/models/element';

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

    mouseover(el: WebViewElement, webview: Electron.WebviewTag) {
        if (!el) {
            this.overlay.removeHoverRect();
            this.clearHoveredElement();
            return;
        }
        if (this.hoveredElement && this.hoveredElement.selector === el.selector) {
            return;
        }
        const adjustedRect = this.overlay.adaptRectFromSourceElement(el.rect, webview);
        this.overlay.updateHoverRect(adjustedRect);
        this.setHoveredElement(el);
    }

    click(els: WebViewElement[], webview: Electron.WebviewTag) {
        this.overlay.removeClickedRects();
        this.clearSelectedElements();

        for (const el of els) {
            const adjustedRect = this.overlay.adaptRectFromSourceElement(el.rect, webview);
            this.overlay.addClickRect(adjustedRect, el.styles);
            this.addSelectedElement(el);
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
