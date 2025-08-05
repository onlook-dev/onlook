import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame.tsx';
import { api } from '@/trpc/client';
import { fromFrame, fromPartialFrame } from '@onlook/db';
import { FrameType, type Frame, type WebFrame } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { v4 as uuid } from 'uuid';
import type { EditorEngine } from '../engine';
import { FrameNavigationManager } from './navigation';

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
    private _navigation = new FrameNavigationManager();
    private _disposers: Array<() => void> = [];

    constructor(private editorEngine: EditorEngine) {
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

    get navigation(): FrameNavigationManager {
        return this._navigation;
    }

    getAll(): FrameData[] {
        return Array.from(this._frameIdToData.values());
    }

    get(id: string): FrameData | undefined {
        return this._frameIdToData.get(id);
    }

    registerView(frame: Frame, view: WebFrameView) {
        const isSelected = this.isSelected(frame.id);
        this._frameIdToData.set(frame.id, { frame, view, selected: isSelected });
        const framePathname = new URL(view.src).pathname;
        this._navigation.registerFrame(frame.id, framePathname);
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

    select(frames: Frame[], multiselect = false) {
        if (!multiselect) {
            this.deselectAll();
        }
        for (const frame of frames) {
            this.updateFrameSelection(frame.id, !this.isSelected(frame.id));
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
        this._disposers.forEach((dispose) => dispose());
        this._disposers = [];
        this._navigation.clearAllHistory();
    }

    disposeFrame(frameId: string) {
        this._frameIdToData.delete(frameId);
        this.editorEngine?.ast?.mappings?.remove(frameId);
        this._navigation.removeFrame(frameId);
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

    // Navigation history methods
    async goBack(frameId: string): Promise<void> {
        const previousPath = this._navigation.goBack(frameId);
        if (previousPath) {
            await this.navigateToPath(frameId, previousPath, false);
        }
    }

    async goForward(frameId: string): Promise<void> {
        const nextPath = this._navigation.goForward(frameId);
        if (nextPath) {
            await this.navigateToPath(frameId, nextPath, false);
        }
    }

    async navigateToPath(frameId: string, path: string, addToHistory = true): Promise<void> {
        const frameData = this.get(frameId);
        if (!frameData?.view) {
            console.warn('No frame view available for navigation');
            return;
        }

        try {
            const currentUrl = frameData.view.src;
            const baseUrl = currentUrl ? new URL(currentUrl).origin : null;

            if (!baseUrl) {
                console.warn('No base URL found');
                return;
            }

            await this.updateAndSaveToStorage(frameId, { url: `${baseUrl}${path}` });

            this.editorEngine.pages.setActivePath(frameId, path);

            this.editorEngine.posthog.capture('page_navigate', {
                path,
            });

            // Add to navigation history
            if (addToHistory) {
                this._navigation.addToHistory(frameId, path);
            }
        } catch (error) {
            console.error('Navigation failed:', error);
        }
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
        } else {
            console.error('Failed to delete frame');
        }
    }

    async create(frame: WebFrame) {
        const success = await api.frame.create.mutate(fromFrame(roundDimensions(frame)));

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
            this._frameIdToData.set(frameId, {
                ...existingFrame,
                frame: newFrame,
                selected: existingFrame.selected,
            });
        }
        await this.saveToStorage(frameId, frame);
    }

    saveToStorage = debounce(this.undebouncedSaveToStorage.bind(this), 1000);

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

    async duplicateSelected() {
        for (const frame of this.selected) {
            await this.duplicate(frame.frame.id);
        }
    }

    async deleteSelected() {
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }

        for (const frame of this.selected) {
            await this.delete(frame.frame.id);
        }
    }
}
