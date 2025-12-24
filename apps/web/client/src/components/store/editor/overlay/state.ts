import type { DomElementStyles, RectDimensions } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';

export interface MeasurementState {
    fromRect: RectDimensions;
    toRect: RectDimensions;
}

export interface ClickRectState extends RectDimensions {
    isComponent?: boolean;
    styles: DomElementStyles | null;
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

export interface DragElementState {
    rect: RectDimensions;
    styles: Record<string, string>;
    isComponent?: boolean;
    id: string;
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

    removeHoverRect = () => {
        this.hoverRect = null;
    };

    updateInsertRect = (rect: RectDimensions | null) => {
        this.insertRect = rect;
    };

    addClickRect = (
        rect: RectDimensions,
        styles: DomElementStyles | null,
        isComponent?: boolean,
        domId?: string,
    ) => {
        this.clickRects = [
            ...this.clickRects,
            {
                ...rect,
                styles,
                isComponent,
                id: domId ?? nanoid(4),
            },
        ];
    };

    updateClickedRects = (newRect: Partial<RectDimensions>) => {
        this.clickRects = this.clickRects.map((rect) => ({
            ...rect,
            ...newRect,
        }));
    };

    updateClickRectStyles = (
        id: string,
        styles: DomElementStyles | null,
        rect?: RectDimensions,
    ) => {
        this.clickRects = this.clickRects.map((clickRect) => {
            if (clickRect.id === id) {
                return {
                    ...clickRect,
                    ...(rect ?? {}),
                    styles: {
                        defined: {
                            ...clickRect.styles?.defined,
                            ...styles?.defined,
                        },
                        computed: {
                            ...clickRect.styles?.computed,
                            ...styles?.computed,
                        },
                    },
                };
            }
            return clickRect;
        });
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

    updateTextEditor = (rect: RectDimensions, {
        content,
        styles,
    }: {
        content?: string;
        styles?: Record<string, string>;
    }) => {
        if (!this.textEditor) return;
        
        const newContent = content ?? this.textEditor.content;
        const newStyles = styles ?? this.textEditor.styles;
        
        // Only update if something actually changed
        const rectChanged = 
            rect.top !== this.textEditor.rect.top ||
            rect.left !== this.textEditor.rect.left ||
            rect.width !== this.textEditor.rect.width ||
            rect.height !== this.textEditor.rect.height;
        
        const contentChanged = newContent !== this.textEditor.content;
        const stylesChanged = JSON.stringify(newStyles) !== JSON.stringify(this.textEditor.styles);
        
        if (rectChanged || contentChanged || stylesChanged) {
            this.textEditor = {
                ...this.textEditor,
                rect,
                content: newContent,
                styles: newStyles
            };
        }
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
