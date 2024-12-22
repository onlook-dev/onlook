import type { RectDimensions } from './components';

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
}
