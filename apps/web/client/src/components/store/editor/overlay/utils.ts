import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import { EditorAttributes } from '@onlook/constants';
import type { ElementPosition, RectDimensions } from '@onlook/models';

/**
 * Calculates the cumulative offset between an element and its ancestor,
 * taking into account CSS transforms and offset positions.
 */
export function getRelativeOffset(element: HTMLElement, ancestor: HTMLElement) {
    let top = 0,
        left = 0;
    let currentElement = element;

    while (currentElement && currentElement !== ancestor) {
        // Handle CSS transforms
        const transform = window.getComputedStyle(currentElement).transform;
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            top += matrix.m42; // translateY
            left += matrix.m41; // translateX
        }

        // Add offset positions
        top += currentElement.offsetTop || 0;
        left += currentElement.offsetLeft || 0;

        // Move up to parent
        const offsetParent = currentElement.offsetParent as HTMLElement;
        if (!offsetParent || offsetParent === ancestor) {
            break;
        }
        currentElement = offsetParent;
    }

    return { top, left };
}

/**
 * Adapts a rectangle from a frameView element to the overlay coordinate space.
 * This ensures that overlay rectangles perfectly match the source elements,
 * similar to design tools like Figma/Framer.
 */
export function adaptRectToCanvas(
    rect: RectDimensions,
    frameView: WebFrameView,
    inverse = false,
): RectDimensions {
    const canvasContainer = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
    if (!canvasContainer) {
        console.error('Canvas container not found');
        return rect;
    }

    // Get canvas transform matrix to handle scaling and translation
    const canvasTransform = new DOMMatrix(getComputedStyle(canvasContainer).transform);

    // Get scale from transform matrix
    const scale = inverse ? 1 / canvasTransform.a : canvasTransform.a;

    // Calculate offsets relative to canvas container
    const sourceOffset = getRelativeOffset(frameView, canvasContainer);

    // Transform coordinates to fixed overlay space
    return {
        width: rect.width * scale,
        height: rect.height * scale,
        top: (rect.top + sourceOffset.top + canvasTransform.f / scale) * scale,
        left: (rect.left + sourceOffset.left + canvasTransform.e / scale) * scale,
    };
}

export function adaptValueToCanvas(value: number, inverse = false): number {
    const canvasContainer = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
    if (!canvasContainer) {
        console.error('Canvas container not found');
        return value;
    }
    const canvasTransform = new DOMMatrix(getComputedStyle(canvasContainer).transform);
    const scale = inverse ? 1 / canvasTransform.a : canvasTransform.a; // Get scale from transform matrix
    return value * scale;
}

/**
 * Get the relative mouse position a frameView element inside the canvas container.
 */
export function getRelativeMousePositionToFrameView(
    e: React.MouseEvent<HTMLDivElement>,
    frameView: WebFrameView,
    inverse: boolean = false,
): ElementPosition {
    const rect = frameView.getBoundingClientRect();
    const canvasContainer = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
    if (!canvasContainer) {
        console.error('Canvas container not found');
        return rect;
    }

    // Get canvas transform matrix to handle scaling and translation
    const canvasTransform = new DOMMatrix(getComputedStyle(canvasContainer).transform);

    const scale = inverse ? 1 / canvasTransform.a : canvasTransform.a; // Get scale from transform matrix

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
}
