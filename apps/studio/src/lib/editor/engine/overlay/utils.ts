import type { WebviewTag } from 'electron/renderer';
import type { RectDimensions } from './components';

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
    // Find common ancestor for coordinate space transformation
    const commonAncestor = overlayContainer.parentElement as HTMLElement;
    if (!commonAncestor) {
        throw new Error('Overlay container must have a parent element');
    }

    // Calculate offsets relative to common ancestor
    const sourceOffset = getRelativeOffset(webview, commonAncestor);
    const overlayOffset = getRelativeOffset(overlayContainer, commonAncestor);

    // Transform coordinates to overlay space
    return {
        width: rect.width,
        height: rect.height,
        top: rect.top + sourceOffset.top - overlayOffset.top,
        left: rect.left + sourceOffset.left - overlayOffset.left,
    };
}
