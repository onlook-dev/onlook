import type { Branch, Frame, Positionable } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { calculateNonOverlappingPosition } from '@onlook/utility/src/position';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

interface BranchWithFrames {
    branch: Branch;
    frames: Frame[];
    primaryFrame: Frame;
    relativeOffsets: Array<{ frameId: string; offset: { x: number; y: number } }>;
}

interface FuzzyMatchResult {
    branch: Branch;
    score: number;
}

/**
 * Calculate fuzzy match score between search term and branch name/description
 */
function calculateFuzzyScore(searchTerm: string, branch: Branch): number {
    const searchLower = searchTerm.toLowerCase();
    const nameLower = branch.name.toLowerCase();
    const descLower = branch.description?.toLowerCase() || '';

    let score = 0;

    // Exact match gets highest score
    if (nameLower === searchLower) {
        score += 100;
    }
    // Starts with gets high score
    else if (nameLower.startsWith(searchLower)) {
        score += 80;
    }
    // Contains gets medium score
    else if (nameLower.includes(searchLower)) {
        score += 60;
    }
    // Search term contains branch name (reverse match)
    else if (searchLower.includes(nameLower)) {
        score += 40;
    }

    // Description matches get lower weight
    if (descLower.includes(searchLower)) {
        score += 20;
    }

    // Partial word matches
    const searchWords = searchLower.split(/\s+/);
    const nameWords = nameLower.split(/\s+/);
    for (const searchWord of searchWords) {
        if (nameWords.some(nameWord => nameWord.includes(searchWord) || searchWord.includes(nameWord))) {
            score += 10;
        }
    }

    return score;
}

/**
 * Find branches by fuzzy matching names/descriptions
 */
function findBranchesByFuzzyMatch(
    searchTerms: string[],
    allBranches: Branch[],
    confidenceThreshold: number = 0.7,
): { matches: Branch[]; ambiguous: Array<{ term: string; candidates: FuzzyMatchResult[] }> } {
    const matches: Branch[] = [];
    const ambiguous: Array<{ term: string; candidates: FuzzyMatchResult[] }> = [];

    for (const term of searchTerms) {
        const scored: FuzzyMatchResult[] = allBranches.map(branch => ({
            branch,
            score: calculateFuzzyScore(term, branch),
        }));

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Normalize score to 0-1 range (assuming max score is around 100)
        const maxScore = scored[0]?.score || 0;
        const normalizedScore = maxScore > 0 ? maxScore / 100 : 0;

        if (normalizedScore >= confidenceThreshold && scored[0]) {
            matches.push(scored[0].branch);
        } else if (scored.length > 0 && scored[0]!.score > 0) {
            // Ambiguous - multiple candidates
            ambiguous.push({
                term,
                candidates: scored.filter(s => s.score > 0).slice(0, 5), // Top 5 candidates
            });
        }
    }

    return { matches, ambiguous };
}

/**
 * Get workspace bounds (10x canvas size centered around middle)
 * Uses existing frames to determine reasonable bounds
 */
function getWorkspaceBounds(allFrames: Frame[]): { minX: number; minY: number; maxX: number; maxY: number } {
    if (allFrames.length === 0) {
        // Default bounds: 10000x10000 centered at origin
        const size = 10000;
        return {
            minX: -size / 2,
            minY: -size / 2,
            maxX: size / 2,
            maxY: size / 2,
        };
    }

    // Find bounds of all frames
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const frame of allFrames) {
        const frameRight = frame.position.x + frame.dimension.width;
        const frameBottom = frame.position.y + frame.dimension.height;

        minX = Math.min(minX, frame.position.x);
        minY = Math.min(minY, frame.position.y);
        maxX = Math.max(maxX, frameRight);
        maxY = Math.max(maxY, frameBottom);
    }

    // Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate size (use 10x the current span)
    const spanX = maxX - minX || 2000;
    const spanY = maxY - minY || 2000;
    const sizeX = Math.max(spanX * 10, 10000);
    const sizeY = Math.max(spanY * 10, 10000);

    return {
        minX: centerX - sizeX / 2,
        minY: centerY - sizeY / 2,
        maxX: centerX + sizeX / 2,
        maxY: centerY + sizeY / 2,
    };
}

/**
 * Constrain position to workspace bounds
 */
function constrainToBounds(
    position: { x: number; y: number },
    dimension: { width: number; height: number },
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
): { x: number; y: number } {
    let x = position.x;
    let y = position.y;

    // Constrain X
    if (x < bounds.minX) {
        x = bounds.minX;
    } else if (x + dimension.width > bounds.maxX) {
        x = bounds.maxX - dimension.width;
    }

    // Constrain Y
    if (y < bounds.minY) {
        y = bounds.minY;
    } else if (y + dimension.height > bounds.maxY) {
        y = bounds.maxY - dimension.height;
    }

    return { x, y };
}

/**
 * Sort branches by current position (left-to-right, top-to-bottom)
 */
function sortBranchesByPosition(branches: BranchWithFrames[]): BranchWithFrames[] {
    return [...branches].sort((a, b) => {
        const posA = a.primaryFrame.position;
        const posB = b.primaryFrame.position;

        // Primary: Y position (top to bottom)
        if (Math.abs(posA.y - posB.y) > 50) {
            return posA.y - posB.y;
        }
        // Secondary: X position (left to right)
        return posA.x - posB.x;
    });
}

export class ArrangeBranchesTool extends ClientTool {
    static readonly toolName = 'arrange_branches';
    static readonly description = 'Arrange branches on the canvas based on their characteristics. Supports relative positioning with collision detection. Branches can be identified by selection, IDs, or fuzzy name matching.';
    static readonly parameters = z.object({
        branchIds: z.array(z.string().uuid()).optional().describe('Array of branch UUIDs to arrange'),
        branchNames: z.array(z.string()).optional().describe('Array of branch names or descriptions to arrange (supports fuzzy matching)'),
        relativeTo: z.string().optional().describe('Branch ID, name, or description to position branches relative to (supports fuzzy matching)'),
        direction: z.enum(['horizontal', 'vertical']).optional().default('horizontal').describe('Direction to arrange branches: horizontal (left-to-right) or vertical (top-to-bottom)'),
        spacing: z.number().optional().default(100).describe('Minimum spacing between branches in pixels'),
    });
    static readonly icon = Icons.Layout;

    async handle(
        args: z.infer<typeof ArrangeBranchesTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<string> {
        // Step 1: Branch Identification
        const selectedFrames = editorEngine.frames.selected;
        let targetBranchIds: Set<string> = new Set();

        // Prefer selected frames
        if (selectedFrames.length > 0) {
            for (const frameData of selectedFrames) {
                targetBranchIds.add(frameData.frame.branchId);
            }
        }

        // Fall back to branchIds parameter
        if (targetBranchIds.size === 0 && args.branchIds && args.branchIds.length > 0) {
            targetBranchIds = new Set(args.branchIds);
        }

        // Fall back to branchNames with fuzzy matching
        if (targetBranchIds.size === 0 && args.branchNames && args.branchNames.length > 0) {
            const allBranches = editorEngine.branches.allBranches;
            const fuzzyResult = findBranchesByFuzzyMatch(args.branchNames, allBranches);

            if (fuzzyResult.ambiguous.length > 0) {
                const ambiguousMessages = fuzzyResult.ambiguous.map(
                    ({ term, candidates }) =>
                        `Ambiguous match for "${term}": ${candidates.map(c => `"${c.branch.name}" (score: ${c.score.toFixed(2)})`).join(', ')}`,
                );
                throw new Error(
                    `Could not uniquely identify branches. ${ambiguousMessages.join('; ')}. Please provide more specific names or use branch IDs.`,
                );
            }

            if (fuzzyResult.matches.length === 0) {
                const availableNames = allBranches.map(b => b.name).join(', ');
                throw new Error(
                    `No branches found matching: ${args.branchNames.join(', ')}. Available branches: ${availableNames}`,
                );
            }

            targetBranchIds = new Set(fuzzyResult.matches.map(b => b.id));
        }

        // Validate branches exist
        const targetBranches: Branch[] = [];
        for (const branchId of targetBranchIds) {
            const branch = editorEngine.branches.getBranchById(branchId);
            if (!branch) {
                throw new Error(`Branch with ID ${branchId} not found.`);
            }
            targetBranches.push(branch);
        }

        if (targetBranches.length === 0) {
            throw new Error('No branches selected or specified. Please select branches or provide branchIds/branchNames.');
        }

        if (targetBranches.length === 1) {
            return 'Only one branch specified. Nothing to arrange.';
        }

        // Step 2: Get all frames for each branch
        const branchesWithFrames: BranchWithFrames[] = [];
        const allFrames = editorEngine.frames.getAll();

        for (const branch of targetBranches) {
            const branchFrames = editorEngine.frames.getByBranchId(branch.id);
            if (branchFrames.length === 0) {
                continue; // Skip branches without frames
            }

            const frames = branchFrames.map(fd => fd.frame);
            const primaryFrame = frames[0]!;

            // Calculate relative offsets for all frames from primary frame
            const relativeOffsets = frames.map(frame => ({
                frameId: frame.id,
                offset: {
                    x: frame.position.x - primaryFrame.position.x,
                    y: frame.position.y - primaryFrame.position.y,
                },
            }));

            branchesWithFrames.push({
                branch,
                frames,
                primaryFrame,
                relativeOffsets,
            });
        }

        if (branchesWithFrames.length === 0) {
            throw new Error('No branches with frames found to arrange.');
        }

        // Step 3: Handle relativeTo branch
        let referenceBranch: BranchWithFrames | null = null;
        if (args.relativeTo) {
            // Try exact ID match first
            const refBranch = editorEngine.branches.getBranchById(args.relativeTo);
            if (refBranch) {
                const refFrames = editorEngine.frames.getByBranchId(refBranch.id);
                if (refFrames.length > 0) {
                    referenceBranch = {
                        branch: refBranch,
                        frames: refFrames.map(fd => fd.frame),
                        primaryFrame: refFrames[0]!.frame,
                        relativeOffsets: [],
                    };
                }
            }

            // Try fuzzy match
            if (!referenceBranch) {
                const allBranches = editorEngine.branches.allBranches;
                const fuzzyResult = findBranchesByFuzzyMatch([args.relativeTo], allBranches);
                if (fuzzyResult.matches.length > 0) {
                    const refBranch = fuzzyResult.matches[0];
                    const refFrames = editorEngine.frames.getByBranchId(refBranch.id);
                    if (refFrames.length > 0) {
                        referenceBranch = {
                            branch: refBranch,
                            frames: refFrames.map(fd => fd.frame),
                            primaryFrame: refFrames[0]!.frame,
                            relativeOffsets: [],
                        };
                    }
                }
            }

            if (!referenceBranch) {
                throw new Error(`Reference branch "${args.relativeTo}" not found or has no frames.`);
            }
        }

        // Step 4: Get workspace bounds
        const workspaceBounds = getWorkspaceBounds(allFrames.map(fd => fd.frame));

        // Step 5: Calculate positions
        // Sort branches by current position (default behavior)
        const sortedBranches = sortBranchesByPosition(branchesWithFrames);

        // Get all existing frames for collision detection (excluding frames we're moving)
        const framesToMoveIds = new Set(branchesWithFrames.flatMap(bwf => bwf.frames.map(f => f.id)));
        const existingFramesForCollision: Positionable[] = allFrames
            .map(fd => fd.frame)
            .filter(frame => !framesToMoveIds.has(frame.id))
            .map(frame => ({
                id: frame.id,
                position: frame.position,
                dimension: frame.dimension,
            }));

        const newPositions: Array<{ branchId: string; framePositions: Array<{ frameId: string; position: { x: number; y: number } }> }> = [];
        const spacing = args.spacing ?? 100;

        if (referenceBranch) {
            // Position relative to reference branch
            const refPos = referenceBranch.primaryFrame.position;
            const refDim = referenceBranch.primaryFrame.dimension;
            const direction = args.direction ?? 'horizontal';

            // Track position for sequential arrangement
            let currentPos = refPos;
            let currentDim = refDim;

            for (const branchWithFrames of sortedBranches) {
                // Skip reference branch itself
                if (branchWithFrames.branch.id === referenceBranch.branch.id) {
                    continue;
                }

                const primaryDim = branchWithFrames.primaryFrame.dimension;
                let proposedPosition: { x: number; y: number };

                if (direction === 'horizontal') {
                    proposedPosition = {
                        x: currentPos.x + currentDim.width + spacing,
                        y: currentPos.y,
                    };
                } else {
                    proposedPosition = {
                        x: currentPos.x,
                        y: currentPos.y + currentDim.height + spacing,
                    };
                }

                // Constrain to bounds
                proposedPosition = constrainToBounds(proposedPosition, primaryDim, workspaceBounds);

                // Calculate non-overlapping position
                const nonOverlappingPos = calculateNonOverlappingPosition(
                    {
                        id: branchWithFrames.primaryFrame.id,
                        position: proposedPosition,
                        dimension: primaryDim,
                    },
                    [...existingFramesForCollision, ...newPositions.flatMap(np => {
                        // Include already-positioned frames in collision detection
                        const positionedBranch = branchesWithFrames.find(bwf => bwf.branch.id === np.branchId);
                        if (!positionedBranch) return [];
                        return np.framePositions.map(fp => ({
                            id: fp.frameId,
                            position: fp.position,
                            dimension: positionedBranch.frames.find(f => f.id === fp.frameId)!.dimension,
                        }));
                    })],
                    spacing,
                );

                // Constrain again after collision detection
                const finalPosition = constrainToBounds(nonOverlappingPos, primaryDim, workspaceBounds);

                // Calculate positions for all frames in branch
                const framePositions = branchWithFrames.frames.map(frame => ({
                    frameId: frame.id,
                    position: {
                        x: finalPosition.x + branchWithFrames.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.x,
                        y: finalPosition.y + branchWithFrames.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.y,
                    },
                }));

                newPositions.push({
                    branchId: branchWithFrames.branch.id,
                    framePositions,
                });

                // Add positioned frames to collision context
                existingFramesForCollision.push(...framePositions.map(fp => ({
                    id: fp.frameId,
                    position: fp.position,
                    dimension: branchWithFrames.frames.find(f => f.id === fp.frameId)!.dimension,
                })));

                // Update current position for next iteration
                currentPos = finalPosition;
                currentDim = primaryDim;
            }
        } else {
            // Arrange branches relative to each other
            const direction = args.direction ?? 'horizontal';

            // Use first branch as anchor
            const anchorBranch = sortedBranches[0]!;
            let anchorPos = anchorBranch.primaryFrame.position;
            let currentOffset = 0;

            // Position anchor branch (may need to adjust if it overlaps)
            const anchorProposedPos = calculateNonOverlappingPosition(
                {
                    id: anchorBranch.primaryFrame.id,
                    position: anchorPos,
                    dimension: anchorBranch.primaryFrame.dimension,
                },
                existingFramesForCollision,
                spacing,
            );
            const anchorFinalPos = constrainToBounds(anchorProposedPos, anchorBranch.primaryFrame.dimension, workspaceBounds);

            const anchorFramePositions = anchorBranch.frames.map(frame => ({
                frameId: frame.id,
                position: {
                    x: anchorFinalPos.x + anchorBranch.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.x,
                    y: anchorFinalPos.y + anchorBranch.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.y,
                },
            }));

            newPositions.push({
                branchId: anchorBranch.branch.id,
                framePositions: anchorFramePositions,
            });

            // Add anchor frames to collision context
            existingFramesForCollision.push(...anchorFramePositions.map(fp => ({
                id: fp.frameId,
                position: fp.position,
                dimension: anchorBranch.frames.find(f => f.id === fp.frameId)!.dimension,
            })));

            // Track previous branch position for relative positioning
            let previousBranchPos = anchorFinalPos;
            let previousBranchDim = anchorBranch.primaryFrame.dimension;

            // Position remaining branches
            for (let i = 1; i < sortedBranches.length; i++) {
                const branchWithFrames = sortedBranches[i]!;
                const primaryDim = branchWithFrames.primaryFrame.dimension;
                let proposedPosition: { x: number; y: number };

                if (direction === 'horizontal') {
                    proposedPosition = {
                        x: previousBranchPos.x + previousBranchDim.width + spacing,
                        y: previousBranchPos.y,
                    };
                } else {
                    proposedPosition = {
                        x: previousBranchPos.x,
                        y: previousBranchPos.y + previousBranchDim.height + spacing,
                    };
                }

                // Constrain to bounds
                proposedPosition = constrainToBounds(proposedPosition, primaryDim, workspaceBounds);

                // Calculate non-overlapping position
                const nonOverlappingPos = calculateNonOverlappingPosition(
                    {
                        id: branchWithFrames.primaryFrame.id,
                        position: proposedPosition,
                        dimension: primaryDim,
                    },
                    existingFramesForCollision,
                    spacing,
                );

                // Constrain again
                const finalPosition = constrainToBounds(nonOverlappingPos, primaryDim, workspaceBounds);

                // Calculate positions for all frames in branch
                const framePositions = branchWithFrames.frames.map(frame => ({
                    frameId: frame.id,
                    position: {
                        x: finalPosition.x + branchWithFrames.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.x,
                        y: finalPosition.y + branchWithFrames.relativeOffsets.find(ro => ro.frameId === frame.id)!.offset.y,
                    },
                }));

                newPositions.push({
                    branchId: branchWithFrames.branch.id,
                    framePositions,
                });

                // Add positioned frames to collision context
                existingFramesForCollision.push(...framePositions.map(fp => ({
                    id: fp.frameId,
                    position: fp.position,
                    dimension: branchWithFrames.frames.find(f => f.id === fp.frameId)!.dimension,
                })));

                // Update previous branch position for next iteration
                previousBranchPos = finalPosition;
                previousBranchDim = primaryDim;
            }
        }

        // Step 6: Update frame positions
        const updatePromises: Promise<void>[] = [];
        for (const { framePositions } of newPositions) {
            for (const { frameId, position } of framePositions) {
                updatePromises.push(
                    editorEngine.frames.updateAndSaveToStorage(frameId, { position }),
                );
            }
        }

        await Promise.all(updatePromises);

        // Format response
        const branchNames = newPositions.map(np => {
            const branch = branchesWithFrames.find(bwf => bwf.branch.id === np.branchId);
            return branch?.branch.name || np.branchId;
        });

        return `Successfully arranged ${newPositions.length} branch${newPositions.length > 1 ? 'es' : ''}: ${branchNames.join(', ')}. All frames moved together maintaining relative positions, with no overlaps.`;
    }

    static getLabel(input?: z.infer<typeof ArrangeBranchesTool.parameters>): string {
        const count = input?.branchIds?.length || input?.branchNames?.length || 0;
        return `Arranging ${count > 0 ? count : 'selected'} branch${count !== 1 ? 'es' : ''}`;
    }
}

