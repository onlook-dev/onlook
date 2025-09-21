import type { RectDimension, RectPosition } from '@onlook/models';

export interface SnapBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

export interface SnapTarget {
    position: RectPosition;
    snapLines: SnapLine[];
    distance: number;
}

export interface SnapLine {
    id: string;
    type: SnapLineType;
    orientation: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
    frameIds: string[];
}

export enum SnapLineType {
    EDGE_LEFT = 'edge-left',
    EDGE_RIGHT = 'edge-right',
    EDGE_TOP = 'edge-top',
    EDGE_BOTTOM = 'edge-bottom',
    CENTER_HORIZONTAL = 'center-horizontal',
    CENTER_VERTICAL = 'center-vertical',
    SPACING = 'spacing',
}

export interface SnapFrame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    bounds: SnapBounds;
}

export interface SnapConfig {
    threshold: number;
    enabled: boolean;
    showGuidelines: boolean;
}