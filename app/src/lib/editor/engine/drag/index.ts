import React from 'react';
import { ActionManager } from '../action';
import { OverlayManager } from '../overlay';
import { DomElement } from '/common/models/element';

interface Position {
    x: number;
    y: number;
}

export class DragManager {
    isDragging: boolean = false;
    dragElement: DomElement | undefined;

    constructor(
        private overlay: OverlayManager,
        private action: ActionManager,
    ) {}

    start(el: DomElement) {
        this.isDragging = true;
        this.dragElement = el;
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToOverlay: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.isDragging || !this.dragElement) {
            return;
        }
    }

    end(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.isDragging || !this.dragElement) {
            return null;
        }
    }
}
