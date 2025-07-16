import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import { api } from '@/trpc/client';
import { fromFrame, fromPartialFrame } from '@onlook/db';
import { FrameType, type Frame, type WebFrame } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { v4 as uuid } from 'uuid';
import type { EditorEngine } from '../engine';

export interface FrameData {
    frame: Frame;
    view: WebFrameView | null;
    selected: boolean;
}

function roundDimensions(frame: WebFrame): WebFrame {
    return {
        ...frame,
        position: {
            x: Math.round(frame.position.x),
            y: Math.round(frame.position.y),
        },
        dimension: {
            width: Math.round(frame.dimension.width),
            height: Math.round(frame.dimension.height),
        },
    };
}

export class FramesManager {
    private _frameIdToData = new Map<string, FrameData>();
    private disposers: Array<() => void> = [];

    constructor(
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
    }

    private updateFrameSelection(id: string, selected: boolean): void {
        const data = this._frameIdToData.get(id);
        if (data) {
            data.selected = selected;
            this._frameIdToData.set(id, data);
        }
    }

    applyFrames(frames: Frame[]) {
        for (const frame of frames) {
            this._frameIdToData.set(frame.id, { frame, view: null, selected: false });
        }
    }

    get selected(): FrameData[] {
        return Array.from(this._frameIdToData.values()).filter((w) => w.selected);
    }

    getAll(): FrameData[] {
        return Array.from(this._frameIdToData.values());
    }

    get(id: string): FrameData | undefined {
        return this._frameIdToData.get(id);
    }

    registerView(frame: Frame, view: WebFrameView) {
        this._frameIdToData.set(frame.id, { frame, view, selected: false });
    }

    deregister(frame: Frame) {
        this._frameIdToData.delete(frame.id);
    }

    deregisterAll() {
        this._frameIdToData.clear();
    }

    isSelected(id: string) {
        return this._frameIdToData.get(id)?.selected ?? false;
    }

    select(frames: Frame[]) {
        this.deselectAll();

        for (const frame of frames) {
            this.updateFrameSelection(frame.id, true);
        }
        this.notify();
    }

    deselect(frame: Frame) {
        this.updateFrameSelection(frame.id, false);
        this.notify();
    }

    deselectAll() {
        for (const [id] of this._frameIdToData) {
            this.updateFrameSelection(id, false);
        }
        this.notify();
    }

    private notify() {
        this._frameIdToData = new Map(this._frameIdToData);
    }

    clear() {
        this.deregisterAll();
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];
    }

    disposeFrame(frameId: string) {
        this._frameIdToData.delete(frameId);
        this.editorEngine?.ast?.mappings?.remove(frameId);
    }

    reloadAllViews() {
        for (const frameData of this.getAll()) {
            frameData.view?.reload();
        }
    }

    reloadView(id: string) {
        const frameData = this.get(id);
        if (!frameData?.view) {
            console.error('Frame view not found for reload', id);
            return;
        }
        frameData.view.reload();
    }

    async delete(id: string) {
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }

        const frameData = this.get(id);
        if (!frameData?.view) {
            console.error('Frame not found for delete', id);
            return;
        }

        const success = await api.frame.delete.mutate({
            frameId: frameData.frame.id,
        });

        if (success) {
            this.disposeFrame(frameData.frame.id);
            this._frameIdToData.delete(id);
        } else {
            console.error('Failed to delete frame');
        }
    }

    async create(frame: WebFrame) {
        const success = await api.frame.create.mutate(
            fromFrame(roundDimensions(frame)),
        );

        if (success) {
            this._frameIdToData.set(frame.id, { frame, view: null, selected: false });
        } else {
            console.error('Failed to create frame');
        }
    }

    async duplicate(id: string) {
        const frameData = this.get(id);
        if (!frameData?.view) {
            console.error('Frame view not found for duplicate', id);
            return;
        }

        // Force to webframe for now, later we can support other frame types
        if (frameData.frame.type !== FrameType.WEB) {
            console.error('No handler for this frame type', frameData.frame.type);
            return;
        }

        const frame = frameData.frame as WebFrame;
        const newFrame: WebFrame = {
            ...frame,
            id: uuid(),
            position: {
                x: frame.position.x + frame.dimension.width + 100,
                y: frame.position.y,
            },
        };

        await this.create(newFrame);
    }

    async updateAndSaveToStorage(frameId: string, frame: Partial<WebFrame>) {
        const existingFrame = this.get(frameId);
        if (existingFrame) {
            const newFrame = { ...existingFrame.frame, ...frame };
            this._frameIdToData.set(frameId, { ...existingFrame, frame: newFrame });
        }
        this.saveToStorage(frameId, frame);
    }

    saveToStorage = debounce(this.undebouncedSaveToStorage, 1000);

    async undebouncedSaveToStorage(frameId: string, frame: Partial<WebFrame>) {
        try {
            const frameToUpdate = fromPartialFrame(frame);
            const success = await api.frame.update.mutate({
                frameId,
                frame: frameToUpdate,
            });

            if (!success) {
                console.error('Failed to update frame');
            }
        } catch (error) {
            console.error('Failed to update frame', error);
        }
    }

    canDelete() {
        return this.getAll().length > 1;
    }

    canDuplicate() {
        return this.selected.length > 0;
    }

    duplicateSelected() {
        for (const frame of this.selected) {
            this.duplicate(frame.frame.id);
        }
    }

    deleteSelected() {
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }

        for (const frame of this.selected) {
            this.delete(frame.frame.id);
        }
    }
}
