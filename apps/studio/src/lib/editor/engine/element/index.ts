import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import type { RemoveElementAction } from '@onlook/models/actions';
import type { DomElement, WebViewElement } from '@onlook/models/element';

export class ElementManager {
    private hoveredElement: WebViewElement | undefined;
    private selectedElements: WebViewElement[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    set selected(elements: WebViewElement[]) {
        this.selectedElements = elements;
    }

    mouseover(domEl: DomElement, webview: Electron.WebviewTag) {
        if (!domEl) {
            this.editorEngine.overlay.removeHoverRect();
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
        const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            webviewEl.rect,
            webview,
        );
        const isComponent = this.editorEngine.ast.getInstance(domEl.selector) !== undefined;
        this.editorEngine.overlay.updateHoverRect(adjustedRect, isComponent);
        this.setHoveredElement(webviewEl);
    }

    showMeasurement() {
        this.editorEngine.overlay.removeMeasurement();
        if (!this.selected.length || !this.hovered) {
            return;
        }

        const selectedEl = this.selected[0];
        const hoverEl = this.hovered;

        const webViewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webViewId);
        if (!webview) {
            return;
        }

        const selectedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            selectedEl.rect,
            webview,
        );
        const hoverRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            hoverEl.rect,
            webview,
        );

        this.editorEngine.overlay.updateMeasurement(selectedRect, hoverRect);
    }

    shiftClick(domEl: DomElement, webview: Electron.WebviewTag) {
        const selectedEls = this.selected;
        const isAlreadySelected = selectedEls.some((el) => el.selector === domEl.selector);
        let newSelectedEls: DomElement[] = [];
        if (isAlreadySelected) {
            newSelectedEls = selectedEls.filter((el) => el.selector !== domEl.selector);
        } else {
            newSelectedEls = [...selectedEls, domEl];
        }
        this.click(newSelectedEls, webview);
    }

    click(domEls: DomElement[], webview: Electron.WebviewTag) {
        this.editorEngine.overlay.removeClickedRects();
        this.clearSelectedElements();

        const webviewEls: WebViewElement[] = domEls.map((el) => {
            const webviewElement: WebViewElement = {
                ...el,
                webviewId: webview.id,
            };
            return webviewElement;
        });

        for (const webviewEl of webviewEls) {
            const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
                webviewEl.rect,
                webview,
            );
            const isComponent = this.editorEngine.ast.getInstance(webviewEl.selector) !== undefined;
            this.editorEngine.overlay.addClickRect(adjustedRect, webviewEl.styles, isComponent);
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
        const newSelected: DomElement[] = [];
        for (const el of this.selected) {
            const newEl: DomElement | null = await webview.executeJavaScript(
                `window.api?.getElementWithSelector('${escapeSelector(el.selector)}', true)`,
            );
            if (!newEl) {
                console.error('Element not found');
                continue;
            }
            newSelected.push(newEl);
        }
        this.click(newSelected, webview);
    }

    private debouncedRefreshClickedElements = debounce(this.undebouncedRefreshClickedElements, 100);

    async delete() {
        const selected = this.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl: WebViewElement = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        const { isDynamic, type } = await webview.executeJavaScript(
            `window.api?.isDynamicElement('${escapeSelector(selectedEl.selector)}')`,
        );

        if (isDynamic) {
            alert(
                `This element is a generated element and cannot be deleted because its part of a ${type} expression`,
            );
            return;
        }

        const removeAction = (await webview.executeJavaScript(
            `window.api?.getRemoveActionFromSelector('${escapeSelector(selectedEl.selector)}', '${webviewId}')`,
        )) as RemoveElementAction | undefined;
        if (!removeAction) {
            console.error('Remove action not found');
            return;
        }
        const templateNode = this.editorEngine.ast.getAnyTemplateNode(selectedEl.selector);
        const codeBlock = await this.editorEngine.code.getCodeBlock(templateNode);
        if (!codeBlock) {
            console.error('Code block not found');
        }
        removeAction.codeBlock = codeBlock || undefined;
        this.editorEngine.action.run(removeAction);
    }
}
