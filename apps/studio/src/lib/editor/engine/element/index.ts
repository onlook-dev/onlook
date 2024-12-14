import type { RemoveElementAction } from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { toast } from '@onlook/ui/use-toast';

export class ElementManager {
    private hoveredElement: DomElement | undefined;
    private selectedElements: DomElement[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    set selected(elements: DomElement[]) {
        this.selectedElements = elements;
    }

    mouseover(domEl: DomElement, webview: Electron.WebviewTag) {
        if (!domEl) {
            this.editorEngine.overlay.removeHoverRect();
            this.clearHoveredElement();
            return;
        }
        if (this.hoveredElement && this.hoveredElement.domId === domEl.domId) {
            return;
        }

        const webviewEl: DomElement = {
            ...domEl,
            webviewId: webview.id,
        };
        const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            webviewEl.rect,
            webview,
        );
        const isComponent = !!domEl.instanceId;
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

    async shiftClick(domEl: DomElement, webview: Electron.WebviewTag) {
        const selectedEls = this.selected;
        const isAlreadySelected = selectedEls.some((el) => el.domId === domEl.domId);
        let newSelectedEls: DomElement[] = [];
        if (isAlreadySelected) {
            newSelectedEls = selectedEls.filter((el) => el.domId !== domEl.domId);
        } else {
            newSelectedEls = [...selectedEls, domEl];
        }
        await this.click(newSelectedEls, webview);
    }

    async click(domEls: DomElement[], webview: Electron.WebviewTag) {
        this.editorEngine.overlay.removeClickedRects();
        this.clearSelectedElements();

        for (const domEl of domEls) {
            const isSvgChild = await webview.executeJavaScript(`
                (function() {
                    const el = document.querySelector('[data-onlook-dom-id="${domEl.domId}"]');
                    return el?.parentElement?.tagName.toLowerCase() === 'svg';
                })()
            `);

            let elementToSelect = domEl;
            if (isSvgChild) {
                const parentEl = await webview.executeJavaScript(`
                    (function() {
                        const el = document.querySelector('[data-onlook-dom-id="${domEl.domId}"]');
                        const parent = el.parentElement;
                        return window.api?.getDomElementByDomId(parent.getAttribute('data-onlook-dom-id'));
                    })()
                `);
                if (parentEl) {
                    elementToSelect = parentEl;
                }
            }

            const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
                elementToSelect.rect,
                webview,
            );
            const isComponent = !!elementToSelect.instanceId;
            this.editorEngine.overlay.addClickRect(
                adjustedRect,
                elementToSelect.styles,
                isComponent,
            );
            this.addSelectedElement(elementToSelect);
        }
    }

    async refreshSelectedElements(webview: Electron.WebviewTag) {
        await this.debouncedRefreshClickedElements(webview);
    }

    setHoveredElement(element: DomElement) {
        this.hoveredElement = element;
    }

    clearHoveredElement() {
        this.hoveredElement = undefined;
    }

    addSelectedElement(element: DomElement) {
        this.selectedElements.push(element);
    }

    clear() {
        this.clearHoveredElement();
        this.clearSelectedElements();
    }

    private clearSelectedElements() {
        this.selectedElements = [];
    }

    private async undebouncedRefreshClickedElements(webview: Electron.WebviewTag) {
        const newSelected: DomElement[] = [];
        for (const el of this.selected) {
            const newEl: DomElement | null = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${el.domId}', true)`,
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
        const selectedEl: DomElement = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        const dynamicElementType = await webview.executeJavaScript(
            `window.api?.getDynamicElementType('${selectedEl.domId}')`,
        );

        if (dynamicElementType) {
            toast({
                title: 'Invalid Action',
                description: `This element is part of a react expression (${dynamicElementType}) and cannot be deleted`,
                variant: 'destructive',
            });

            return;
        }

        const removeAction = (await webview.executeJavaScript(
            `window.api?.getRemoveActionFromDomId('${selectedEl.domId}', '${webviewId}')`,
        )) as RemoveElementAction | null;
        if (!removeAction) {
            console.error('Remove action not found');
            return;
        }
        const codeBlock = await this.editorEngine.code.getCodeBlock(selectedEl.oid);
        if (!codeBlock) {
            console.error('Code block not found');
        }

        this.editorEngine.action.run(removeAction);
    }
}
