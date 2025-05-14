import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import type { Frame } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export interface FrameData {
    frame: Frame;
    view: WebFrameView;
    selected: boolean;
    // state: FrameState;
}

const DEFAULT_DATA = {
    selected: false,
    // state: FrameState.NOT_RUNNING,
};

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
        this.frameIdToData.set(frame.id, { frame, view, ...DEFAULT_DATA });
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

    select(frame: Frame) {
        const data = this.frameIdToData.get(frame.id);
        if (data) {
            data.selected = true;
            this.frameIdToData.set(frame.id, data);
            // this.editorEngine.pages.handleWebviewUrlChange(frameView.id);
            this.notify();
        }
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
}
