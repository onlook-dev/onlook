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

    const parentWidth = element.getBoundingClientRect().width;
    const similarityThreshold = parentWidth * 0.15;

    const horizontalDiff = Math.abs(firstRect.left - secondRect.left);
    const verticalDiff = Math.abs(firstRect.top - secondRect.top);

    // If there's significant vertical separation, default to vertical arrangement
    // This matches natural document flow and handles stacked elements correctly
    if (verticalDiff > firstRect.height * 0.5) {
        return DisplayDirection.VERTICAL;
    }

    // If elements are primarily arranged horizontally (more horizontal separation than vertical)
    // and don't have significant vertical separation, consider it a horizontal arrangement
    if (horizontalDiff > verticalDiff && verticalDiff < firstRect.height * 0.5) {
        return DisplayDirection.HORIZONTAL;
    }

    // Default to vertical for all other cases
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
