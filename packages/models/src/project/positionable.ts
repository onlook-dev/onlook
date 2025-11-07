import type { RectDimension, RectPosition } from './rect';

/**
 * Minimal abstraction for any canvas object that can be positioned.
 * This allows tools to work with frames now and extend to other object types (images, rectangles, assets) later.
 */
export interface Positionable {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
}

