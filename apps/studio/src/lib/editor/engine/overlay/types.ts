import type { RectDimensions } from './components';

export interface OverlayContainer {
    updateHoverRect: (rect: RectDimensions | null, isComponent?: boolean) => void;
    updateInsertRect: (rect: RectDimensions | null) => void;
    addClickRect: (
        rect: RectDimensions,
        styles?: { margin?: string; padding?: string },
        isComponent?: boolean,
    ) => void;
    removeClickRect: () => void;
    clear: () => void;
}
