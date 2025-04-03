import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { RectDimensions } from './rect';

export interface MeasurementState {
    fromRect: RectDimensions;
    toRect: RectDimensions;
}

export interface ClickRectState extends RectDimensions {
    isComponent?: boolean;
    styles?: Record<string, string>;
    id: string;
}

export interface TextEditorState {
    rect: RectDimensions;
    content: string;
    styles: Record<string, string>;
    isComponent?: boolean;
    onChange?: (content: string) => void;
    onStop?: () => void;
}

export interface HoverRectState {
    rect: RectDimensions;
    isComponent?: boolean;
}

export class OverlayState {
    clickRects: ClickRectState[] = [];
    insertRect: RectDimensions | null = null;
    textEditor: TextEditorState | null = null;
    hoverRect: HoverRectState | null = null;
    measurement: MeasurementState | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    updateHoverRect = (rect: RectDimensions | null, isComponent?: boolean) => {
        this.hoverRect = rect ? { rect, isComponent } : null;
    };

    updateInsertRect = (rect: RectDimensions | null) => {
        this.insertRect = rect;
    };

    addClickRect = (
        rect: RectDimensions,
        styles: Record<string, string>,
        isComponent?: boolean,
    ) => {
        this.clickRects = [
            ...this.clickRects,
            {
                ...rect,
                styles,
                isComponent,
                id: nanoid(4),
            },
        ];
    };

    updateClickedRects = (newRect: Partial<RectDimensions>) => {
        this.clickRects = this.clickRects.map((rect) => ({
            ...rect,
            ...newRect,
        }));
    };

    removeClickRects = () => {
        this.clickRects = [];
    };

    addTextEditor = (
        rect: RectDimensions,
        content: string,
        styles: Record<string, string>,
        onChange: (content: string) => void,
        onStop: () => void,
        isComponent?: boolean,
    ) => {
        this.textEditor = { rect, content, styles, onChange, onStop, isComponent };
    };

    updateTextEditor = (rect: RectDimensions) => {
        this.textEditor = this.textEditor ? { ...this.textEditor, rect } : null;
    };

    removeTextEditor = () => {
        this.textEditor = null;
    };

    updateMeasurement = (fromRect: RectDimensions, toRect: RectDimensions) => {
        this.measurement = { fromRect, toRect };
    };

    removeMeasurement = () => {
        this.measurement = null;
    };

    clear = () => {
        this.hoverRect = null;
        this.insertRect = null;
        this.clickRects = [];
        this.textEditor = null;
        this.measurement = null;
    };
}
