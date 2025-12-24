import type { Frame } from '@onlook/models';

export function calculateNonOverlappingPosition(
    proposedFrame: Frame,
    existingFrames: Frame[],
): { x: number; y: number } {
    const SPACING = 100;

    if (existingFrames.length === 0) {
        return proposedFrame.position;
    }

    // Check if original position is free
    if (!hasOverlap(proposedFrame.position, proposedFrame, existingFrames, SPACING)) {
        return proposedFrame.position;
    }

    // Use Bottom-Left Fill algorithm: find the bottommost, then leftmost valid position
    return findBottomLeftPosition(proposedFrame, existingFrames, SPACING);
}

function hasOverlap(
    position: { x: number; y: number },
    proposedFrame: Frame,
    existingFrames: Frame[],
    spacing: number,
): boolean {
    const proposed = {
        left: position.x,
        top: position.y,
        right: position.x + proposedFrame.dimension.width,
        bottom: position.y + proposedFrame.dimension.height,
    };

    return existingFrames.some((existingFrame) => {
        if (existingFrame.id === proposedFrame.id) return false;

        const existing = {
            left: existingFrame.position.x - spacing,
            top: existingFrame.position.y - spacing,
            right: existingFrame.position.x + existingFrame.dimension.width + spacing,
            bottom: existingFrame.position.y + existingFrame.dimension.height + spacing,
        };

        return (
            proposed.left < existing.right &&
            proposed.right > existing.left &&
            proposed.top < existing.bottom &&
            proposed.bottom > existing.top
        );
    });
}

function findBottomLeftPosition(
    proposedFrame: Frame,
    existingFrames: Frame[],
    spacing: number,
): { x: number; y: number } {
    // Get all potential anchor points (corners of existing frames)
    const anchorPoints = getAnchorPoints(existingFrames, spacing);

    // Add the original position as a candidate
    anchorPoints.push(proposedFrame.position);

    // Filter valid positions and sort by bottom-left preference
    const validPositions = anchorPoints
        .filter((point) => !hasOverlap(point, proposedFrame, existingFrames, spacing))
        .sort((a, b) => {
            // Primary: prefer lower Y (bottom)
            if (Math.abs(a.y - b.y) > 10) {
                return a.y - b.y;
            }
            // Secondary: prefer lower X (left)
            return a.x - b.x;
        });

    if (validPositions.length > 0) {
        return validPositions[0]!;
    }

    // Fallback: extend to the right of the rightmost frame
    let rightmostX = proposedFrame.position.x;
    let rightmostY = proposedFrame.position.y;

    for (const frame of existingFrames) {
        const frameRight = frame.position.x + frame.dimension.width;
        if (frameRight > rightmostX) {
            rightmostX = frameRight;
            rightmostY = frame.position.y;
        }
    }

    return {
        x: rightmostX + spacing,
        y: rightmostY,
    };
}

function getAnchorPoints(existingFrames: Frame[], spacing: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    for (const frame of existingFrames) {
        const { position, dimension } = frame;

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
