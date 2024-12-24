import type { RectDimensions } from './rect';

export interface OverlayContainer {
    updateHoverRect: (rect: RectDimensions | null, isComponent?: boolean) => void;
    updateInsertRect: (rect: RectDimensions | null) => void;
    addClickRect: (
        rect: RectDimensions,
        styles: Record<string, string>,
        isComponent?: boolean,
    ) => void;
    removeClickRects: () => void;
    clear: () => void;
    addTextEditor: (
        rect: RectDimensions,
        content: string,
        styles: Record<string, string>,
        onChange: (content: string) => void,
        onStop: () => void,
        isComponent?: boolean,
    ) => void;
    updateTextEditor: (rect: RectDimensions) => void;
    removeTextEditor: () => void;
}
