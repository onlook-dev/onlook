import type { Positionable, RectPosition } from '@onlook/models';

/**
 * Calculate a non-overlapping position for a positionable object given existing objects.
 * Uses Bottom-Left Fill algorithm: finds the bottommost, then leftmost valid position.
 * 
 * @param proposed - The object to position (with proposed position)
 * @param existing - Array of all existing objects to avoid collisions with
 * @param spacing - Minimum spacing between objects (default: 100)
 * @returns A non-overlapping position
 */
export function calculateNonOverlappingPosition(
    proposed: Positionable,
    existing: Positionable[],
    spacing: number = 100,
): RectPosition {
    if (existing.length === 0) {
        return proposed.position;
    }

    // Check if original position is free
    if (!hasOverlap(proposed.position, proposed, existing, spacing)) {
        return proposed.position;
    }

    // Use Bottom-Left Fill algorithm: find the bottommost, then leftmost valid position
    return findBottomLeftPosition(proposed, existing, spacing);
}

function hasOverlap(
    position: RectPosition,
    proposed: Positionable,
    existing: Positionable[],
    spacing: number,
): boolean {
    const proposedRect = {
        left: position.x,
        top: position.y,
        right: position.x + proposed.dimension.width,
        bottom: position.y + proposed.dimension.height,
    };

    return existing.some((existingItem) => {
        if (existingItem.id === proposed.id) return false;

        const existingRect = {
            left: existingItem.position.x - spacing,
            top: existingItem.position.y - spacing,
            right: existingItem.position.x + existingItem.dimension.width + spacing,
            bottom: existingItem.position.y + existingItem.dimension.height + spacing,
        };

        return (
            proposedRect.left < existingRect.right &&
            proposedRect.right > existingRect.left &&
            proposedRect.top < existingRect.bottom &&
            proposedRect.bottom > existingRect.top
        );
    });
}

function findBottomLeftPosition(
    proposed: Positionable,
    existing: Positionable[],
    spacing: number,
): RectPosition {
    // Get all potential anchor points (corners of existing objects)
    const anchorPoints = getAnchorPoints(existing, spacing);

    // Add the original position as a candidate
    anchorPoints.push(proposed.position);

    // Filter valid positions and sort by bottom-left preference
    const validPositions = anchorPoints
        .filter((point) => !hasOverlap(point, proposed, existing, spacing))
        .sort((a, b) => {
            // Primary: prefer higher Y (bottommost positions)
            if (Math.abs(a.y - b.y) > 10) {
                return b.y - a.y;
            }
            // Secondary: prefer lower X (leftmost positions)
            return a.x - b.x;
        });

    if (validPositions.length > 0) {
        return validPositions[0]!;
    }

    // Fallback: extend to the right of the rightmost object
    let rightmostX = proposed.position.x;
    let rightmostY = proposed.position.y;

    for (const item of existing) {
        const itemRight = item.position.x + item.dimension.width;
        if (itemRight > rightmostX) {
            rightmostX = itemRight;
            rightmostY = item.position.y;
        }
    }

    return {
        x: rightmostX + spacing,
        y: rightmostY,
    };
}

function getAnchorPoints(existing: Positionable[], spacing: number): RectPosition[] {
    const points: RectPosition[] = [];

    for (const item of existing) {
        const { position, dimension } = item;

        // Priority positions: right and below (common UI patterns)
        points.push(
            // Right edge, same Y
            { x: position.x + dimension.width + spacing, y: position.y },
            // Bottom edge, same X
            { x: position.x, y: position.y + dimension.height + spacing },
            // Bottom-right corner
            {
                x: position.x + dimension.width + spacing,
                y: position.y + dimension.height + spacing,
            },
        );
    }

    return points;
}

