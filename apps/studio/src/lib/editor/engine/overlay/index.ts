import { MeasurementImpl } from './measurement';
import { ClickRect, HoverRect, InsertRect } from './rect';
import { EditTextInput } from './textEdit';
import { querySelectorCommand } from '/common/helpers';

export class OverlayManager {
    overlayContainer: HTMLElement | undefined;
    hoverRect: HoverRect;
    insertRect: InsertRect;
    clickedRects: ClickRect[];
    editTextInput: EditTextInput;
    measureEle: MeasurementImpl;
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };

    constructor() {
        this.hoverRect = new HoverRect();
        this.insertRect = new InsertRect();
        this.editTextInput = new EditTextInput();
        this.measureEle = new MeasurementImpl();
        this.clickedRects = [];
        this.bindMethods();
    }

    setOverlayContainer = (container: HTMLElement) => {
        this.overlayContainer = container;
        this.appendRectToPopover(this.hoverRect.element);
        this.appendRectToPopover(this.insertRect.element);
        this.appendRectToPopover(this.editTextInput.element);
        this.appendRectToPopover(this.measureEle.element);
    };

    bindMethods = () => {
        this.setOverlayContainer = this.setOverlayContainer.bind(this);

        // Update
        this.hideHoverRect = this.hideHoverRect.bind(this);
        this.showHoverRect = this.showHoverRect.bind(this);
        this.updateHoverRect = this.updateHoverRect.bind(this);
        this.updateInsertRect = this.updateInsertRect.bind(this);
        this.updateEditTextInput = this.updateEditTextInput.bind(this);

        // Remove
        this.removeHoverRect = this.removeHoverRect.bind(this);
        this.removeClickedRects = this.removeClickedRects.bind(this);
        this.removeEditTextInput = this.removeEditTextInput.bind(this);
        this.removeMeasurement = this.removeMeasurement.bind(this);
        this.clear = this.clear.bind(this);
    };

    getBoundingRect(selector: string, sourceWebview: Electron.WebviewTag) {
        return sourceWebview.executeJavaScript(
            `${querySelectorCommand(selector)}.getBoundingClientRect().toJSON()`,
            true,
        );
    }

    getComputedStyle(
        selector: string,
        sourceWebview: Electron.WebviewTag,
    ): Promise<CSSStyleDeclaration> {
        return sourceWebview.executeJavaScript(
            `getComputedStyle(${querySelectorCommand(selector)})`,
            true,
        );
    }

    getRelativeOffset(element: HTMLElement, ancestor: HTMLElement) {
        let top = 0,
            left = 0;
        while (element && element !== ancestor) {
            const transform = window.getComputedStyle(element).transform;
            const matrix = new DOMMatrix(transform);

            top += matrix.m42;
            left += matrix.m41;

            top += element.offsetTop || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent as HTMLElement;
        }
        return { top, left };
    }

    adaptRectFromSourceElement(rect: DOMRect, webview: Electron.WebviewTag) {
        const commonAncestor = this.overlayContainer?.parentElement as HTMLElement;
        const sourceOffset = this.getRelativeOffset(webview, commonAncestor);

        const overlayOffset = this.overlayContainer
            ? this.getRelativeOffset(this.overlayContainer, commonAncestor)
            : { top: 0, left: 0 };

        const adjustedRect = {
            ...rect,
            top: rect.top + sourceOffset.top - overlayOffset.top,
            left: rect.left + sourceOffset.left - overlayOffset.left,
        };
        return adjustedRect;
    }

    appendRectToPopover = (rect: HTMLElement) => {
        if (this.overlayContainer) {
            this.overlayContainer.appendChild(rect);
        }
    };

    addClickRect = (
        rect: DOMRect,
        style: Record<string, string> | CSSStyleDeclaration,
        isComponent?: boolean,
    ) => {
        const clickRect = new ClickRect();
        this.appendRectToPopover(clickRect.element);
        this.clickedRects.push(clickRect);
        clickRect.render(
            {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                padding: style.padding,
                margin: style.margin,
            },
            isComponent,
        );
    };

    updateHoverRect = (rect: DOMRect, isComponent?: boolean) => {
        this.hoverRect.render(rect, isComponent);
    };

    updateInsertRect = (rect: DOMRect) => {
        this.insertRect.render(rect);
    };

    updateMeasurement = (fromRect: DOMRect, toRect: DOMRect) => {
        this.measureEle.render(fromRect, toRect);
    };

    updateEditTextInput = (
        rect: DOMRect,
        content: string,
        styles: Record<string, string>,
        onChange: (content: string) => void,
        onStop: () => void,
        isComponent?: boolean,
    ) => {
        this.editTextInput.render(rect, content, styles, onChange, onStop, isComponent);
        this.editTextInput.enable();
    };

    updateTextInputSize = (rect: DOMRect) => {
        this.editTextInput.updateSize(rect);
    };

    hideHoverRect = () => {
        this.hoverRect.element.style.display = 'none';
    };

    showHoverRect = () => {
        this.hoverRect.element.style.display = 'block';
    };

    removeHoverRect = () => {
        this.hoverRect.render({ width: 0, height: 0, top: 0, left: 0 });
    };

    removeInsertRect = () => {
        this.insertRect.render({ width: 0, height: 0, top: 0, left: 0 });
    };

    removeClickedRects = () => {
        this.clickedRects.forEach((clickRect) => {
            clickRect.element.remove();
        });
        this.clickedRects = [];
    };

    removeEditTextInput = () => {
        this.editTextInput.render({ width: 0, height: 0, top: 0, left: 0 });
        this.editTextInput.element.style.display = 'none';
        this.editTextInput.disable();
    };

    removeMeasurement = () => {
        this.measureEle.remove();
    };

    clear = () => {
        this.removeHoverRect();
        this.removeClickedRects();
        this.removeEditTextInput();
        this.removeMeasurement();
    };
}
