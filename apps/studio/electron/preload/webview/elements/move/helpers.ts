export enum DisplayDirection {
    VERTICAL = 'vertical',
    HORIZONTAL = 'horizontal',
}

export function getDisplayDirection(element: HTMLElement): DisplayDirection {
    if (!element || !element.children || element.children.length < 2) {
        return DisplayDirection.VERTICAL;
    }

    const children = Array.from(element.children);
    const firstChild = children[0];
    const secondChild = children[1];

    const firstRect = firstChild.getBoundingClientRect();
    const secondRect = secondChild.getBoundingClientRect();

    // Calculate vertical and horizontal differences
    const verticalDiff = Math.abs(secondRect.top - firstRect.top);
    const horizontalDiff = Math.abs(secondRect.left - firstRect.left);

    // Calculate overlap thresholds based on element dimensions
    const verticalThreshold = Math.max(firstRect.height, secondRect.height) * 0.3;
    const horizontalThreshold = Math.min(firstRect.width, secondRect.width) * 0.3;

    // If elements have significant vertical separation (>30% of height),
    // consider it a vertical arrangement
    if (verticalDiff > verticalThreshold) {
        return DisplayDirection.VERTICAL;
    }

    // If elements have significant horizontal separation (>30% of width)
    // and minimal vertical separation, consider it horizontal
    if (horizontalDiff > horizontalThreshold && verticalDiff < verticalThreshold) {
        return DisplayDirection.HORIZONTAL;
    }

    // Default to vertical for natural document flow
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
