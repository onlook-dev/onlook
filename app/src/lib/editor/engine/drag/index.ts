import React from 'react';
import { ActionManager } from '../action';
import { OverlayManager } from '../overlay';
import { DomElement } from '/common/models/element';

interface Position {
    x: number;
    y: number;
}

export class DragManager {
    dragElement: DomElement | undefined;

    constructor(
        private overlay: OverlayManager,
        private action: ActionManager,
    ) {}

    get isDragging() {
        return !!this.dragElement;
    }

    start(el: DomElement) {
        this.dragElement = el;
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement) {
            return;
        }
    }

    end(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement) {
            return null;
        }

        this.dragElement = undefined;
    }
}
