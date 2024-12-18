import { MeasurementImpl } from './measurement';
import { EditTextInput } from './textEdit';
import type { OverlayContainer } from './types';
import type { RectDimensions } from './components';
import type { WebviewTag } from 'electron/renderer';
import { adaptRectToOverlay, getRelativeOffset } from './utils';

export class OverlayManager {
    overlayContainer: OverlayContainer | undefined;
    overlayElement: HTMLElement | undefined;
    editTextInput: EditTextInput;
    measureEle: MeasurementImpl;
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };

    constructor() {
        this.editTextInput = new EditTextInput();
        this.measureEle = new MeasurementImpl();
        this.bindMethods();
    }

    getDOMContainer = () => {
        if (!this.overlayElement) {
            throw new Error('Overlay element not initialized');
        }
        return this.overlayElement;
    };

    setOverlayContainer = (container: OverlayContainer | HTMLElement) => {
        if (container instanceof HTMLElement) {
            this.overlayElement = container;
            container.appendChild(this.editTextInput.element);
            container.appendChild(this.measureEle.element);
        } else {
            this.overlayContainer = container;
        }
    };

    bindMethods = () => {
        this.setOverlayContainer = this.setOverlayContainer.bind(this);
        this.getDOMContainer = this.getDOMContainer.bind(this);
        this.adaptRect = this.adaptRect.bind(this);
        this.updateHoverRect = this.updateHoverRect.bind(this);
        this.updateInsertRect = this.updateInsertRect.bind(this);
        this.updateMeasurement = this.updateMeasurement.bind(this);
        this.updateEditTextInput = this.updateEditTextInput.bind(this);
        this.updateTextInputSize = this.updateTextInputSize.bind(this);
        this.removeHoverRect = this.removeHoverRect.bind(this);
        this.removeClickedRects = this.removeClickedRects.bind(this);
        this.removeEditTextInput = this.removeEditTextInput.bind(this);
        this.removeMeasurement = this.removeMeasurement.bind(this);
        this.clear = this.clear.bind(this);
    };

    adaptRect = (rect: DOMRect, webview: WebviewTag): RectDimensions => {
        if (!this.overlayElement) {
            throw new Error('Overlay element not initialized');
        }
        return adaptRectToOverlay(rect, webview, this.overlayElement);
    };

    addClickRect = (
        rect: RectDimensions | DOMRect,
        style: Record<string, string> | CSSStyleDeclaration,
        isComponent?: boolean,
    ) => {
        if (!this.overlayContainer) {
            return;
        }

        this.overlayContainer.addClickRect(
            {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
            },
            {
                margin: style.margin?.toString(),
                padding: style.padding?.toString(),
            },
            isComponent,
        );
    };

    updateHoverRect = (rect: RectDimensions | DOMRect | null, isComponent?: boolean) => {
        if (!this.overlayContainer) {
            return;
        }

        if (!rect) {
            this.overlayContainer.updateHoverRect(null);
            return;
        }

        this.overlayContainer.updateHoverRect(
            {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
            },
            isComponent,
        );
    };

    updateInsertRect = (rect: RectDimensions | DOMRect | null) => {
        if (!this.overlayContainer) {
            return;
        }

        if (!rect) {
            this.overlayContainer.updateInsertRect(null);
            return;
        }

        this.overlayContainer.updateInsertRect({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
        });
    };

    updateMeasurement = (fromRect: RectDimensions | DOMRect, toRect: RectDimensions | DOMRect) => {
        this.measureEle.render(fromRect, toRect);
    };

    updateEditTextInput = (
        rect: RectDimensions | DOMRect,
        content: string,
        styles: Record<string, string>,
        onChange: (content: string) => void,
        onStop: () => void,
        isComponent?: boolean,
    ) => {
        this.editTextInput.render(rect, content, styles, onChange, onStop, isComponent);
        this.editTextInput.enable();
    };

    updateTextInputSize = (rect: RectDimensions | DOMRect) => {
        this.editTextInput.updateSize(rect);
    };

    removeHoverRect = () => {
        if (this.overlayContainer) {
            this.overlayContainer.updateHoverRect(null);
        }
    };

    removeInsertRect = () => {
        if (this.overlayContainer) {
            this.overlayContainer.updateInsertRect(null);
        }
    };

    removeClickedRects = () => {
        if (this.overlayContainer) {
            this.overlayContainer.removeClickRect();
        }
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
        if (this.overlayContainer) {
            this.overlayContainer.clear();
        }
        this.removeEditTextInput();
        this.removeMeasurement();
    };
}
