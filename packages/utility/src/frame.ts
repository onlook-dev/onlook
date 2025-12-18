import type { Frame } from '@onlook/models';
import { calculateNonOverlappingPosition as calculateNonOverlappingPositionGeneric } from './position';

/**
 * Calculate a non-overlapping position for a frame given existing frames.
 * This is a Frame-specific wrapper around the generic position utility.
 * 
 * @deprecated Consider using the generic version from './position' for new code
 */
export function calculateNonOverlappingPosition(
    proposedFrame: Frame,
    existingFrames: Frame[],
): { x: number; y: number } {
    const SPACING = 100;
    
    return calculateNonOverlappingPositionGeneric(
        {
            id: proposedFrame.id,
            position: proposedFrame.position,
            dimension: proposedFrame.dimension,
        },
        existingFrames.map(frame => ({
            id: frame.id,
            position: frame.position,
            dimension: frame.dimension,
        })),
        SPACING,
    );
}
