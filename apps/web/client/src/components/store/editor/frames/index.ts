import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import { api } from '@/trpc/client';
import { sendAnalytics } from '@/utils/analytics';
import { fromFrame } from '@onlook/db';
import { FrameType, type Frame, type WebFrame } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { v4 as uuid } from 'uuid';
import type { ProjectManager } from '../../project/manager';
import type { EditorEngine } from '../engine';
import { FrameImpl } from './frame';

export interface FrameData {
    frame: Frame;
    view: WebFrameView;
    selected: boolean;
}

export class FramesManager {
    private frameIdToData = new Map<string, FrameData>();
    private disposers: Array<() => void> = [];
    private _frames: FrameImpl[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    private validateFrameData(id: string, operation: string): FrameData | null {
        const data = this.frameIdToData.get(id);
        if (!data) {
            console.error(`Frame not found for ${operation}`, id);
            return null;
        }
        return data;
    }

    private validateFrame(id: string, operation: string): FrameImpl | null {
        const frame = this.frames.find((f) => f.id === id);
        if (!frame) {
            console.error(`Frame not found for ${operation}`, id);
            return null;
        }
        return frame;
    }

    private async getProjectCanvas() {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            console.error('No project ID available');
            return null;
        }

        const canvas = await api.canvas.get.query({ projectId });
        if (!canvas) {
            console.error('Canvas not found');
            return null;
        }
        return canvas;
    }

    private updateFrameSelection(id: string, selected: boolean): void {
        const data = this.frameIdToData.get(id);
        if (data) {
            data.selected = selected;
            this.frameIdToData.set(id, data);
        }
    }

    private trackFrameAction(action: 'created' | 'deleted' | 'duplicate'): void {
        sendAnalytics(`window ${action}`);
    }

    applyFrames(frames: Frame[]) {
        this.frames = frames.map((frame) => FrameImpl.fromJSON(frame));
    }

    get frames() {
        return this._frames;
    }

    set frames(frames: FrameImpl[]) {
        this._frames = frames;
    }

    get selected(): FrameData[] {
        return Array.from(this.frameIdToData.values()).filter((w) => w.selected);
    }

    getAll(): FrameData[] {
        return Array.from(this.frameIdToData.values());
    }

    get(id: string): FrameData | undefined {
        return this.frameIdToData.get(id);
    }

    register(frame: Frame, view: WebFrameView) {
        this.frameIdToData.set(frame.id, { frame, view, selected: false });
    }

    deregister(frame: Frame) {
        this.frameIdToData.delete(frame.id);
    }

    deregisterAll() {
        this.frameIdToData.clear();
    }

    isSelected(id: string) {
        return this.frameIdToData.get(id)?.selected ?? false;
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
        for (const [id] of this.frameIdToData) {
            this.updateFrameSelection(id, false);
        }
        this.notify();
    }

    private notify() {
        this.frameIdToData = new Map(this.frameIdToData);
    }

    clear() {
        this.deregisterAll();
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];
    }

    disposeFrame(frameId: string) {
        this.frameIdToData.delete(frameId);
        this.editorEngine?.ast?.mappings?.remove(frameId);
    }

    reloadAll() {
        for (const frameData of this.getAll()) {
            frameData.view.reload();
        }
    }

    reload(id: string) {
        const frameData = this.validateFrameData(id, 'reload');
        if (!frameData) return;

        frameData.view.reload();
    }

    screenshot(id: string) {
        const frameData = this.validateFrameData(id, 'screenshot');
        if (!frameData) return;

        // frameData.view.screenshot();
    }

    async delete(id: string) {
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }

        const data = this.validateFrameData(id, 'delete');
        if (!data) return;

        const success = await api.frame.delete.mutate({
            frameId: data.frame.id,
        });

        if (success) {
            this.disposeFrame(data.frame.id);
            this.frames = this.frames.filter((f) => f.id !== id);
            this.trackFrameAction('deleted');
        } else {
            console.error('Failed to delete frame');
        }
    }

    async create(frame: WebFrame) {
        const canvas = await this.getProjectCanvas();
        if (!canvas) return;

        const success = await api.frame.create.mutate(
            fromFrame(canvas.id, this.roundDimensions(frame)),
        );

        if (success) {
            this.frames.push(FrameImpl.fromJSON(frame));
            this.trackFrameAction('created');
        } else {
            console.error('Failed to create frame');
        }
    }

    async duplicate(id: string) {
        const data = this.validateFrameData(id, 'duplicate');
        if (!data) return;

        // Force to webframe for now, later we can support other frame types
        if (data.frame.type !== FrameType.WEB) {
            console.error('No handler for this frame type', data.frame.type);
            return;
        }

        const frame = data.frame as WebFrame;
        const newFrame: WebFrame = {
            id: uuid(),
            url: frame.url,
            dimension: { ...frame.dimension },
            position: {
                x: frame.position.x + frame.dimension.width + 100,
                y: frame.position.y,
            },
            type: frame.type,
        };

        await this.create(newFrame);
        this.trackFrameAction('duplicate');
    }

    updateLocally(id: string, newFrame: Partial<Frame>) {
        const frame = this.validateFrame(id, 'save');
        if (!frame) return;


        const frameImpl = this.validateFrame(id, 'update');
        if (!frameImpl) return;

        frameImpl.update(newFrame);
    }

    async updateAndSaveToStorage(frame: WebFrame) {
        try {
            const dbFrame = await api.frame.get.query({
                frameId: frame.id,
            });

            if (!dbFrame) {
                console.error('Frame not found in database');
                return;
            }

            const canvas = await this.getProjectCanvas();
            if (!canvas) return;

            const frameToUpdate = fromFrame(canvas.id, this.roundDimensions(frame));
            frameToUpdate.id = dbFrame.id;

            const success = await api.frame.update.mutate(frameToUpdate);

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

    roundDimensions(frame: WebFrame): WebFrame {
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
}
