import type { DomElement, ElementPosition } from '@onlook/models';
import type { MoveElementAction } from '@onlook/models/actions';
import { makeAutoObservable } from 'mobx';
import type React from 'react';
import type { EditorEngine } from '../engine';
import type { FrameData } from '../frames';

interface MoveManagerState {
    dragOrigin: ElementPosition;
    dragTarget: DomElement;
    originalIndex: number;
    isDragInProgress: boolean;
}

export class MoveManager {
    state: MoveManagerState | null = null
    MIN_DRAG_DISTANCE = 100;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get shouldDrag() {
        return !!this.state;
    }

    async prepareDrag(el: DomElement, position: ElementPosition, frameView: FrameData) {
        if (!this.editorEngine.elements.selected.some((selected) => selected.domId === el.domId)) {
            console.warn('Element not selected, cannot start drag');
            return;
        }

        const positionType = el.styles?.computed?.position;
        if (positionType === 'absolute') {
            console.warn('Absolute mode dragging is disabled');
            return;
        }

        if (!frameView.view) {
            console.error('No frame view found');
            return;
        }
        const originalIndex = await frameView.view.getElementIndex(el.domId);
        if (originalIndex === null || originalIndex === -1) {
            console.error('Element not found in frame');
            return;
        }

        this.state = {
            dragOrigin: position,
            dragTarget: el,
            originalIndex,
            isDragInProgress: false,
        };

        console.log('prepareDrag', this.state);
    }

    async startDrag(el: DomElement, frameView: FrameData) {
        if (!frameView.view) {
            console.error('No frame view found');
            return;
        }
        const index = await frameView.view.startDrag(el.domId);
        if (index === null || index === -1) {
            this.clear();
            console.warn('Start drag failed, original index is null or -1');
            return;
        }

        if (!this.state) {
            console.error('No state found');
            return;
        }
        this.state.isDragInProgress = true;
    }

    async drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.state) {
            return;
        }

        const frameData = this.editorEngine.frames.get(this.state.dragTarget.frameId);
        if (!frameData?.view) {
            console.error('No frameView found for drag');
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.state.dragOrigin.x;
        const dy = y - this.state.dragOrigin.y;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance > this.MIN_DRAG_DISTANCE) {
            if (!this.state.isDragInProgress) {
                await this.startDrag(this.state.dragTarget, frameData);
            }
        }

        this.editorEngine.overlay.clear();
        try {
            const positionType = this.state.dragTarget.styles?.computed?.position;
            if (positionType === 'absolute') {
                await frameData.view.dragAbsolute(this.state.dragTarget.domId, x, y, this.state.dragOrigin);
            } else {
                await frameData.view.drag(this.state.dragTarget.domId, dx, dy, x, y);
            }
        } catch (error) {
            console.error('Error during drag:', error);
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>) {
        console.log('end', this.state);
        const savedState = this.state;
        this.clear();
        await this.endAllDrag();
        if (!savedState || !savedState.isDragInProgress) {
            return;
        }

        const frameData = this.editorEngine.frames.get(savedState.dragTarget.frameId);
        if (!frameData?.view) {
            console.error('No frameView found for drag end');
            await this.endAllDrag();
            return;
        }

        try {
            const targetDomId = savedState.dragTarget.domId;
            savedState.isDragInProgress = false;

            // Handle absolute positioning
            const position = savedState.dragTarget.styles?.computed?.position;
            if (position === ('absolute' as const)) {
                const res = await frameData.view.endDragAbsolute(targetDomId);

                if (res) {
                    const { left, top } = res;
                    await this.editorEngine.style.updateMultiple({
                        left: left,
                        top: top,
                        transform: 'none',
                    });
                }
            } else {
                // Handle regular drag with index changes
                const res = (await frameData.view.endDrag(targetDomId)) as {
                    newIndex: number;
                    child: DomElement;
                    parent: DomElement;
                } | null;

                if (res && savedState.originalIndex !== undefined) {
                    const { child, parent, newIndex } = res;
                    if (newIndex !== savedState.originalIndex) {
                        const moveAction = this.createMoveAction(
                            frameData.frame.id,
                            child,
                            parent,
                            newIndex,
                            savedState.originalIndex,
                        );
                        await this.editorEngine.action.run(moveAction);
                    }
                }
            }
        } catch (error) {
            console.error('Error ending drag:', error);
            await this.endAllDrag();
        } finally {
            this.clear();
        }
    }

    async endAllDrag() {
        const promises: Promise<unknown>[] = [];

        this.editorEngine.frames.getAll().forEach((frameData) => {
            try {
                if (!frameData.view) {
                    console.error('No frame view found');
                    return;
                }
                const promise = frameData.view.endAllDrag() as Promise<unknown>;
                promises.push(promise);
            } catch (error) {
                console.error('Error in endAllDrag:', error);
            }
        });

        await Promise.all(promises);
    }

    async moveSelected(direction: 'up' | 'down') {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 1 && selected[0]) {
            await this.shiftElement(selected[0], direction);
        } else {
            if (selected.length > 1) {
                console.error('Multiple elements selected, cannot shift');
            } else {
                console.error('No elements selected, cannot shift');
            }
        }
    }

    async shiftElement(element: DomElement, direction: 'up' | 'down'): Promise<void> {
        const frameData = this.editorEngine.frames.get(element.frameId);
        if (!frameData?.view) {
            return;
        }

        try {
            // Get current index and parent
            const currentIndex = await frameData.view.getElementIndex(element.domId);

            if (currentIndex === -1) {
                return;
            }

            const parent = await frameData.view.getParentElement(element.domId);
            if (!parent) {
                return;
            }

            // Get filtered children count for accurate index calculation
            const childrenCount = await frameData.view.getChildrenCount(parent.domId);

            // Calculate new index based on direction and bounds
            const newIndex =
                direction === 'up'
                    ? Math.max(0, currentIndex - 1)
                    : Math.min(childrenCount - 1, currentIndex + 1);

            if (newIndex === currentIndex) {
                return;
            }

            // Create and run move action
            const moveAction = this.createMoveAction(
                frameData.frame.id,
                element,
                parent,
                newIndex,
                currentIndex,
            );

            await this.editorEngine.action.run(moveAction);
        } catch (error) {
            console.error('Error shifting element:', error);
        }
    }

    createMoveAction(
        frameId: string,
        child: DomElement,
        parent: DomElement,
        newIndex: number,
        originalIndex: number,
    ): MoveElementAction {
        return {
            type: 'move-element',
            location: {
                type: 'index',
                targetDomId: parent.domId,
                targetOid: parent.instanceId ?? parent.oid,
                index: newIndex,
                originalIndex: originalIndex,
            },
            targets: [
                {
                    frameId: frameId,
                    domId: child.domId,
                    oid: child.instanceId ?? child.oid,
                },
            ],
        };
    }

    clear() {
        this.state = null;
    }
}
