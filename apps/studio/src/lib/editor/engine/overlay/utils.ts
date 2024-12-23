import type { WebviewTag } from 'electron/renderer';
import type { RectDimensions } from './rect';

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
 * Adapts a rectangle from a webview element to the overlay coordinate space.
 * This ensures that overlay rectangles perfectly match the source elements,
 * similar to design tools like Figma/Framer.
 */
export function adaptRectToOverlay(
    rect: DOMRect,
    webview: WebviewTag,
    overlayContainer: HTMLElement,
): RectDimensions {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
        throw new Error('Canvas container not found');
    }

    // Get canvas transform matrix to handle scaling and translation
    const canvasTransform = new DOMMatrix(getComputedStyle(canvasContainer).transform);
    const scale = canvasTransform.a; // Get scale from transform matrix

    // Calculate offsets relative to canvas container
    const sourceOffset = getRelativeOffset(webview, canvasContainer);

    // Transform coordinates to fixed overlay space
    return {
        width: rect.width * scale,
        height: rect.height * scale,
        top: (rect.top + sourceOffset.top) * scale + canvasTransform.f,
        left: (rect.left + sourceOffset.left) * scale + canvasTransform.e,
    };
}
