import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import { sendAnalytics } from '@/utils/analytics';
import type { Frame, WebFrame } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { v4 as uuid } from 'uuid';
import type { EditorEngine } from '../engine';

export interface FrameData {
    frame: Frame;
    view: WebFrameView;
    selected: boolean;
}

export class FramesManager {
    private frameIdToData = new Map<string, FrameData>();
    private disposers: Array<() => void> = [];

    constructor(private editorEngine: EditorEngine) {
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

        // this.editorEngine?.ast?.mappings?.remove(id);
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

    delete(id: string) {
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
        this.editorEngine.ast.mappings.remove(frame.id);
        this.editorEngine.canvas.frames = this.editorEngine.canvas.frames.filter((f) => f.id !== frame.id);
        this.editorEngine.frames.deselect(frame);
        this.editorEngine.frames.disposeFrame(frame.id);
        sendAnalytics('window deleted');
    }

    duplicate(id: string) {
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

        this.editorEngine.canvas.frames = [...this.editorEngine.canvas.frames, newFrame];
        sendAnalytics('window duplicate');
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
