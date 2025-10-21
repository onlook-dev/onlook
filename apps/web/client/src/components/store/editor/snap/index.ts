import type { RectDimension, RectPosition } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import type { SnapBounds, SnapConfig, SnapFrame, SnapLine, SnapTarget } from './types';
import { SnapLineType } from './types';

const SNAP_CONFIG = {
    DEFAULT_THRESHOLD: 12,
    LINE_EXTENSION: 160,
} as const;

export class SnapManager {
    config: SnapConfig = {
        threshold: SNAP_CONFIG.DEFAULT_THRESHOLD,
        enabled: true,
        showGuidelines: true,
    };

    activeSnapLines: SnapLine[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private createSnapBounds(position: RectPosition, dimension: RectDimension): SnapBounds {
        const left = position.x;
        const top = position.y;
        const right = position.x + dimension.width;
        const bottom = position.y + dimension.height;
        const centerX = position.x + dimension.width / 2;
        const centerY = position.y + dimension.height / 2;

        return {
            left,
            top,
            right,
            bottom,
            centerX,
            centerY,
            width: dimension.width,
            height: dimension.height,
        };
    }

    private getSnapFrames(excludeFrameId?: string): SnapFrame[] {
        return this.editorEngine.frames.getAll()
            .filter(frameData => frameData.frame.id !== excludeFrameId)
            .map(frameData => {
                const frame = frameData.frame;
                return {
                    id: frame.id,
                    position: frame.position,
                    dimension: frame.dimension,
                    bounds: this.createSnapBounds(frame.position, frame.dimension),
                };
            });
    }

    calculateSnapTarget(
        dragFrameId: string,
        currentPosition: RectPosition,
        dimension: RectDimension,
    ): SnapTarget | null {
        if (!this.config.enabled) {
            return null;
        }

        const dragBounds = this.createSnapBounds(currentPosition, dimension);
        const otherFrames = this.getSnapFrames(dragFrameId);
        
        if (otherFrames.length === 0) {
            return null;
        }

        const snapCandidates: Array<{ position: RectPosition; lines: SnapLine[]; distance: number }> = [];

        for (const otherFrame of otherFrames) {
            const candidates = this.calculateSnapCandidates(dragBounds, otherFrame);
            snapCandidates.push(...candidates);
        }

        if (snapCandidates.length === 0) {
            return null;
        }

        snapCandidates.sort((a, b) => a.distance - b.distance);
        const bestCandidate = snapCandidates[0];

        if (!bestCandidate || bestCandidate.distance > this.config.threshold) {
            return null;
        }

        const firstLine = bestCandidate.lines[0];
        if (!firstLine) {
            return null;
        }

        return {
            position: bestCandidate.position,
            snapLines: [firstLine],
            distance: bestCandidate.distance,
        };
    }

    private calculateSnapCandidates(
        dragBounds: SnapBounds,
        otherFrame: SnapFrame,
    ): Array<{ position: RectPosition; lines: SnapLine[]; distance: number }> {
        const candidates: Array<{ position: RectPosition; lines: SnapLine[]; distance: number }> = [];
        
        const edgeAlignments = [
            {
                type: SnapLineType.EDGE_LEFT,
                dragOffset: dragBounds.left,
                targetValue: otherFrame.bounds.left,
                orientation: 'vertical' as const,
            },
            {
                type: SnapLineType.EDGE_LEFT,
                dragOffset: dragBounds.right,
                targetValue: otherFrame.bounds.left,
                orientation: 'vertical' as const,
            },
            {
                type: SnapLineType.EDGE_RIGHT,
                dragOffset: dragBounds.left,
                targetValue: otherFrame.bounds.right,
                orientation: 'vertical' as const,
            },
            {
                type: SnapLineType.EDGE_RIGHT,
                dragOffset: dragBounds.right,
                targetValue: otherFrame.bounds.right,
                orientation: 'vertical' as const,
            },
            {
                type: SnapLineType.EDGE_TOP,
                dragOffset: dragBounds.top,
                targetValue: otherFrame.bounds.top,
                orientation: 'horizontal' as const,
            },
            {
                type: SnapLineType.EDGE_TOP,
                dragOffset: dragBounds.bottom,
                targetValue: otherFrame.bounds.top,
                orientation: 'horizontal' as const,
            },
            {
                type: SnapLineType.EDGE_BOTTOM,
                dragOffset: dragBounds.top,
                targetValue: otherFrame.bounds.bottom,
                orientation: 'horizontal' as const,
            },
            {
                type: SnapLineType.EDGE_BOTTOM,
                dragOffset: dragBounds.bottom,
                targetValue: otherFrame.bounds.bottom,
                orientation: 'horizontal' as const,
            },
            {
                type: SnapLineType.CENTER_HORIZONTAL,
                dragOffset: dragBounds.centerY,
                targetValue: otherFrame.bounds.centerY,
                orientation: 'horizontal' as const,
            },
            {
                type: SnapLineType.CENTER_VERTICAL,
                dragOffset: dragBounds.centerX,
                targetValue: otherFrame.bounds.centerX,
                orientation: 'vertical' as const,
            },
        ];

        for (const alignment of edgeAlignments) {
            const distance = Math.abs(alignment.dragOffset - alignment.targetValue);
            
            if (distance <= this.config.threshold) {
                const offset = alignment.targetValue - alignment.dragOffset;
                const newPosition = alignment.orientation === 'horizontal' 
                    ? { x: dragBounds.left, y: dragBounds.top + offset }
                    : { x: dragBounds.left + offset, y: dragBounds.top };

                const snapLine = this.createSnapLine(alignment.type, alignment.orientation, alignment.targetValue, otherFrame, dragBounds);
                
                
                candidates.push({
                    position: newPosition,
                    lines: [snapLine],
                    distance,
                });
            }
        }

        return candidates;
    }

    private createSnapLine(
        type: SnapLineType,
        orientation: 'horizontal' | 'vertical',
        position: number,
        otherFrame: SnapFrame,
        dragBounds: SnapBounds,
    ): SnapLine {
        let start: number;
        let end: number;

        if (orientation === 'horizontal') {
            start = Math.min(dragBounds.left, otherFrame.bounds.left) - SNAP_CONFIG.LINE_EXTENSION;
            end = Math.max(dragBounds.right, otherFrame.bounds.right) + SNAP_CONFIG.LINE_EXTENSION;
        } else {
            start = Math.min(dragBounds.top, otherFrame.bounds.top) - SNAP_CONFIG.LINE_EXTENSION;
            end = Math.max(dragBounds.bottom, otherFrame.bounds.bottom) + SNAP_CONFIG.LINE_EXTENSION;
        }

        return {
            id: `${type}-${otherFrame.id}-${Date.now()}`,
            type,
            orientation,
            position,
            start,
            end,
            frameIds: [otherFrame.id],
        };
    }

    showSnapLines(lines: SnapLine[]): void {
        if (!this.config.showGuidelines) {
            return;
        }
        this.activeSnapLines = lines;
    }

    hideSnapLines(): void {
        this.activeSnapLines = [];
    }

    detectDimensionAlignment(
        frameId: string,
        dimension: RectDimension,
        position: RectPosition,
    ): SnapLine[] {
        if (!this.config.enabled) {
            return [];
        }

        const dragBounds = this.createSnapBounds(position, dimension);
        const otherFrames = this.getSnapFrames(frameId);

        if (otherFrames.length === 0) {
            return [];
        }

        const snapLines: SnapLine[] = [];

        for (const otherFrame of otherFrames) {
            const widthDifference = Math.abs(dimension.width - otherFrame.bounds.width);
            if (widthDifference <= this.config.threshold) {
                const widthLine = this.createSnapLine(
                    SnapLineType.EDGE_RIGHT,
                    'vertical',
                    dragBounds.right,
                    otherFrame,
                    dragBounds,
                );
                snapLines.push(widthLine);
            }

            const heightDifference = Math.abs(dimension.height - otherFrame.bounds.height);
            if (heightDifference <= this.config.threshold) {
                const heightLine = this.createSnapLine(
                    SnapLineType.EDGE_BOTTOM,
                    'horizontal',
                    dragBounds.bottom,
                    otherFrame,
                    dragBounds,
                );
                snapLines.push(heightLine);
            }
        }

        return snapLines;
    }

    calculateDimensionSnapTarget(
        frameId: string,
        dimension: RectDimension,
        position: RectPosition,
        resizingDimensions?: { width: boolean; height: boolean },
    ): { dimension: RectDimension; snapLines: SnapLine[] } | null {
        if (!this.config.enabled) {
            return null;
        }

        const otherFrames = this.getSnapFrames(frameId);

        if (otherFrames.length === 0) {
            return null;
        }

        let snappedWidth = dimension.width;
        let snappedHeight = dimension.height;
        const snapLines: SnapLine[] = [];

        // Find width matches and prioritize closest
        const widthMatches = otherFrames
            .map((frame) => ({
                frame,
                difference: Math.abs(dimension.width - frame.bounds.width),
            }))
            .filter((match) => match.difference <= this.config.threshold)
            .sort((a, b) => a.difference - b.difference);

        // Only check width if actively resizing width
        if ((resizingDimensions?.width ?? true) && widthMatches.length > 0) {
            const closestWidth = widthMatches[0]!;
            snappedWidth = closestWidth.frame.bounds.width;


            // Create snap bounds with snapped width for line calculation
            const snappedBounds = this.createSnapBounds(position, {
                width: snappedWidth,
                height: dimension.height,
            });

            const widthLine = this.createSnapLine(
                SnapLineType.EDGE_RIGHT,
                'vertical',
                snappedBounds.right,
                closestWidth.frame,
                snappedBounds,
            );
            snapLines.push(widthLine);
        }

        // Find height matches and prioritize closest
        const heightMatches = otherFrames
            .map((frame) => ({
                frame,
                difference: Math.abs(dimension.height - frame.bounds.height),
            }))
            .filter((match) => match.difference <= this.config.threshold)
            .sort((a, b) => a.difference - b.difference);

        // Only check height if actively resizing height
        if ((resizingDimensions?.height ?? true) && heightMatches.length > 0) {
            const closestHeight = heightMatches[0]!;
            snappedHeight = closestHeight.frame.bounds.height;


            // Create snap bounds with snapped height for line calculation
            const snappedBounds = this.createSnapBounds(position, {
                width: snappedWidth,
                height: snappedHeight,
            });

            const heightLine = this.createSnapLine(
                SnapLineType.EDGE_BOTTOM,
                'horizontal',
                snappedBounds.bottom,
                closestHeight.frame,
                snappedBounds,
            );
            snapLines.push(heightLine);
        }

        // Return null if no snapping occurred
        if (snapLines.length === 0) {
            return null;
        }

        return {
            dimension: { width: snappedWidth, height: snappedHeight },
            snapLines,
        };
    }

    setConfig(config: Partial<SnapConfig>): void {
        Object.assign(this.config, config);
    }
}