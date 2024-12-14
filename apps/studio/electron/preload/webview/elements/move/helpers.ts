export enum DisplayDirection {
    VERTICAL = 'vertical',
    HORIZONTAL = 'horizontal',
}

export function getDisplayDirection(element: HTMLElement): DisplayDirection {
    console.log('[Webview] getDisplayDirection called for element:', {
        id: element.id,
        className: element.className,
        childCount: element.children?.length,
    });

    if (!element || !element.children || element.children.length < 2) {
        console.log('[Webview] Not enough children, defaulting to vertical');
        return DisplayDirection.VERTICAL;
    }

    const children = Array.from(element.children);
    const firstChild = children[0] as HTMLElement;
    const secondChild = children[1] as HTMLElement;

    const firstRect = firstChild.getBoundingClientRect();
    const secondRect = secondChild.getBoundingClientRect();

    // Calculate position differences
    const verticalDiff = Math.abs(secondRect.top - firstRect.top);
    const horizontalDiff = Math.abs(secondRect.left - firstRect.left);
    console.log('[Webview] Element positions:', {
        first: { top: firstRect.top, left: firstRect.left },
        second: { top: secondRect.top, left: secondRect.left },
        verticalDiff,
        horizontalDiff,
    });

    // Use more sensitive threshold for vertical detection (10% of height)
    const verticalThreshold = Math.min(firstRect.height, secondRect.height) * 0.1;
    // Use stricter threshold for horizontal detection (50% of width)
    const horizontalThreshold = Math.max(firstRect.width, secondRect.width) * 0.5;

    console.log('[Webview] Detection thresholds:', {
        verticalThreshold,
        horizontalThreshold,
        dimensions: {
            first: { width: firstRect.width, height: firstRect.height },
            second: { width: secondRect.width, height: secondRect.height },
        },
    });

    // Prioritize vertical detection - if elements have any significant vertical separation
    if (verticalDiff > verticalThreshold) {
        console.log('[Webview] Detected vertical arrangement (stacked elements)');
        return DisplayDirection.VERTICAL;
    }

    // Only consider horizontal if elements are clearly side by side
    if (horizontalDiff > horizontalThreshold && verticalDiff < verticalThreshold) {
        console.log('[Webview] Detected horizontal arrangement (side by side)');
        return DisplayDirection.HORIZONTAL;
    }

    // Default to vertical for natural document flow
    console.log('[Webview] Defaulting to vertical arrangement');
    return DisplayDirection.VERTICAL;
}

export function findInsertionIndex(
    elements: Element[],
    x: number,
    y: number,
    displayDirection: DisplayDirection,
): number {
    const midPoints = elements.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    });

    for (let i = 0; i < midPoints.length; i++) {
        if (displayDirection === DisplayDirection.VERTICAL) {
            if (y < midPoints[i].y) {
                return i;
            }
        } else {
            if (x < midPoints[i].x) {
                return i;
            }
        }
    }
    return elements.length;
}

export function findGridInsertionIndex(
    parent: HTMLElement,
    siblings: Element[],
    x: number,
    y: number,
): number {
    const parentRect = parent.getBoundingClientRect();
    const gridComputedStyle = window.getComputedStyle(parent);
    const columns = gridComputedStyle.gridTemplateColumns.split(' ').length;
    const rows = gridComputedStyle.gridTemplateRows.split(' ').length;

    const cellWidth = parentRect.width / columns;
    const cellHeight = parentRect.height / rows;

    const gridX = Math.floor((x - parentRect.left) / cellWidth);
    const gridY = Math.floor((y - parentRect.top) / cellHeight);

    const targetIndex = gridY * columns + gridX;
    return Math.min(Math.max(targetIndex, 0), siblings.length);
}
