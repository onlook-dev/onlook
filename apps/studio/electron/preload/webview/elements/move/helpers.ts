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

    // If elements have significant vertical separation and similar x-positions,
    // they are likely meant to be stacked vertically
    if (verticalDiff > 0 && horizontalDiff <= similarityThreshold) {
        return DisplayDirection.VERTICAL;
    }

    // Otherwise, compare the differences to determine the primary axis of arrangement
    return horizontalDiff > verticalDiff ? DisplayDirection.HORIZONTAL : DisplayDirection.VERTICAL;
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
