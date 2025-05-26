import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import { sendAnalytics } from '@/utils/analytics';
import type { Frame, WebFrame } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { v4 as uuid } from 'uuid';
import type { EditorEngine } from '../engine';
import { api } from '@/trpc/client';
import type { ProjectManager } from '../../project/manager';

export interface FrameData {
    frame: Frame;
    view: WebFrameView;
    selected: boolean;
}

export class FramesManager {
    private frameIdToData = new Map<string, FrameData>();
    private disposers: Array<() => void> = [];

    constructor(private editorEngine: EditorEngine, private projectManager: ProjectManager) {
        makeAutoObservable(this);
    }

    get webviews() {
        return this.frameIdToData;
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
            const data = this.frameIdToData.get(frame.id);
            if (data) {
                data.selected = true;
                this.frameIdToData.set(frame.id, data);
                // this.editorEngine.pages.handleWebviewUrlChange(frameView.id);
            }
        }
        this.notify();
    }

    deselect(frame: Frame) {
        const data = this.frameIdToData.get(frame.id);
        if (data) {
            data.selected = false;
            this.frameIdToData.set(frame.id, data);
            this.notify();
        }
    }

    deselectAll() {
        for (const [id, data] of this.frameIdToData) {
            this.frameIdToData.set(id, { ...data, selected: false });
        }
        this.notify();
    }

    private notify() {
        this.frameIdToData = new Map(this.frameIdToData);
    }

    clear() {
        this.deregisterAll();

        // Run all disposers
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];
    }

    disposeFrame(frameId: string) {
        this.frameIdToData.delete(frameId);

        this.editorEngine?.ast?.mappings?.remove(frameId);
        // this.editorEngine?.errors.clear();
    }

    reloadAll() {
        for (const frame of this.selected) {
            frame.view.reload();
        }
    }

    reload(id: string) {
        const frame = this.frameIdToData.get(id);
        if (!frame) {
            console.error('Frame not found', id);
            return;
        }
        frame.view.reload();
    }

    screenshot(id: string) {
        const frame = this.frameIdToData.get(id);
        if (!frame) {
            console.error('Frame not found', id);
            return;
        }
        // frame.view.screenshot();
    }

    async delete(id: string) {
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }
        const data = this.get(id);

        if (!data) {
            console.error('Frame not found');
            return;
        }
        const { frame } = data

        const success = await api.frame.deleteFrame.mutate({
            frameId: frame.id,
        });

        if (success) {
            this.editorEngine.frames.disposeFrame(frame.id);
            this.editorEngine.canvas.deleteFrame(frame.id);
            sendAnalytics('window deleted');
        } else {
            console.error('Failed to delete frame');
        }
    }

    async create(frame: WebFrame) {
        const canvas = await api.canvas.getCanvas.query({
            projectId: this.projectManager.project?.id ?? '',
        });

        if (!canvas) {
            return;
        }
        const success = await api.frame.createFrame.mutate({
            canvasId: canvas.id,
            url: frame.url,
            type: frame.type,
            x: frame.position.x.toString(),
            y: frame.position.y.toString(),
            width: frame.dimension.width.toString(),
            height: frame.dimension.height.toString(),
        });

        if (success) {
            this.editorEngine.canvas.addFrame(frame);
            sendAnalytics('window created');
        } else {
            console.error('Failed to create frame');
        }
    }

    async duplicate(id: string) {
        const data = this.get(id);
        if (!data) {
            console.error('Frame not found');
            return;
        }

        // Force to webframe for now, later we can support other frame types
        const frame = data.frame as unknown as WebFrame;

        const newFrame: WebFrame = {
            id: uuid(),
            url: frame.url,
            dimension: {
                width: frame.dimension.width,
                height: frame.dimension.height,
            },
            position: {
                x: frame.position.x + frame.dimension.width + 100,
                y: frame.position.y,
            },
            type: frame.type,
        };

        await this.create(newFrame);
        sendAnalytics('window duplicate');
    }

    async update(frame: WebFrame) {
        try {
            const dbFrame = await api.frame.getFrame.query({
                frameId: frame.id,
            });

            if (!dbFrame) {
                console.error('Frame not found');
                return;
            }
            const success = await api.frame.updateFrame.mutate({
                frameId: frame.id,
                x: frame.position.x,
                y: frame.position.y,
                width: frame.dimension.width,
                height: frame.dimension.height,
            });

            if (success) {
                this.editorEngine.canvas.saveFrame(frame.id, frame);
            } else {
                console.error('Failed to update frame');
            }
            
        } catch (error) {
            console.error('Failed to update frame', error);
        }
    }   

    canDelete() {
        return this.editorEngine.frames.getAll().length > 1;
    }

    canDuplicate() {
        return this.editorEngine.frames.selected.length > 0;
    }

    duplicateSelected() {
        for (const frame of this.selected) {
            this.duplicate(frame.frame.id);
        }
    }

    deleteSelected() {
        for (const frame of this.selected) {
            if (!this.canDelete()) {
                console.error('Cannot delete the last frame');
                return;
            }
            this.delete(frame.frame.id);
        }
    }
}
