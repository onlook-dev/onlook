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
export class FrameNavigationManager {
    private frameNavigationHistory = new Map<string, string[]>();
    private frameCurrentHistoryIndex = new Map<string, number>();
    private maxHistorySize = 50;

    constructor() {
        makeAutoObservable(this);
    }

    canGoBack(frameId: string): boolean {
        const history = this.frameNavigationHistory.get(frameId);
        const currentIndex = this.frameCurrentHistoryIndex.get(frameId);

        if (!history || currentIndex === undefined) {
            return false;
        }
        return currentIndex > 0;
    }

    canGoForward(frameId: string): boolean {
        const history = this.frameNavigationHistory.get(frameId);
        const currentIndex = this.frameCurrentHistoryIndex.get(frameId);

        if (!history || currentIndex === undefined) {
            return false;
        }
        return currentIndex < history.length - 1;
    }

    getHistoryLength(frameId: string): number {
        const history = this.frameNavigationHistory.get(frameId);
        return history ? history.length : 0;
    }

    getCurrentHistoryIndex(frameId: string): number {
        return this.frameCurrentHistoryIndex.get(frameId) ?? -1;
    }

    getNavigationHistory(frameId: string): string[] {
        const history = this.frameNavigationHistory.get(frameId);
        return history ? [...history] : [];
    }

    addToHistory(frameId: string, path: string): void {
        let history = this.frameNavigationHistory.get(frameId);
        let currentIndex = this.frameCurrentHistoryIndex.get(frameId);

        if (!history) {
            history = [];
            currentIndex = 0;
        }

        // Ensure currentIndex is properly initialized
        currentIndex ??= 0;

        if (history[currentIndex] === path) {
            return;
        }

        // Remove forward history if we're not at the end
        if (currentIndex < history.length - 1) {
            history = history.slice(0, currentIndex + 1);
        }

        // Add new path to history
        history.push(path);
        currentIndex = history.length - 1;

        // Trim history if it exceeds max size
        if (history.length > this.maxHistorySize) {
            history = history.slice(-this.maxHistorySize);
            currentIndex = history.length - 1;
        }

        this.frameNavigationHistory.set(frameId, history);
        this.frameCurrentHistoryIndex.set(frameId, currentIndex);
    }

    goBack(frameId: string): string | null {
        if (!this.canGoBack(frameId)) {
            return null;
        }

        const history = this.frameNavigationHistory.get(frameId);
        const currentIndex = this.frameCurrentHistoryIndex.get(frameId);

        if (!history || currentIndex === undefined) {
            return null;
        }

        const previousIndex = currentIndex - 1;

        if (previousIndex < 0 || previousIndex >= history.length) {
            return null;
        }

        this.frameCurrentHistoryIndex.set(frameId, previousIndex);
        return history[previousIndex] ?? null;
    }

    goForward(frameId: string): string | null {
        if (!this.canGoForward(frameId)) {
            return null;
        }

        const history = this.frameNavigationHistory.get(frameId);
        const currentIndex = this.frameCurrentHistoryIndex.get(frameId);

        if (!history || currentIndex === undefined) {
            return null;
        }

        const nextIndex = currentIndex + 1;

        if (nextIndex < 0 || nextIndex >= history.length) {
            return null;
        }

        this.frameCurrentHistoryIndex.set(frameId, nextIndex);
        return history[nextIndex] ?? null;
    }

    clearHistory(frameId: string): void {
        this.frameNavigationHistory.delete(frameId);
        this.frameCurrentHistoryIndex.delete(frameId);
    }

    clearAllHistory(): void {
        this.frameNavigationHistory.clear();
        this.frameCurrentHistoryIndex.clear();
    }

    removeFrame(frameId: string): void {
        this.clearHistory(frameId);
    }
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
    private navigationManager = new FrameNavigationManager();

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
        this.navigationManager.clearAllHistory();
    }

    disposeFrame(frameId: string) {
        this._frameIdToData.delete(frameId);
        this.editorEngine?.ast?.mappings?.remove(frameId);
        this.navigationManager.removeFrame(frameId);
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
    get canGoBack(): boolean {
        const selectedFrame = this.selected[0];
        return selectedFrame ? this.navigationManager.canGoBack(selectedFrame.frame.id) : false;
    }

    get canGoForward(): boolean {
        const selectedFrame = this.selected[0];
        return selectedFrame ? this.navigationManager.canGoForward(selectedFrame.frame.id) : false;
    }

    get historyLength(): number {
        const selectedFrame = this.selected[0];
        return selectedFrame ? this.navigationManager.getHistoryLength(selectedFrame.frame.id) : 0;
    }

    get currentHistoryIndex(): number {
        const selectedFrame = this.selected[0];
        return selectedFrame
            ? this.navigationManager.getCurrentHistoryIndex(selectedFrame.frame.id)
            : -1;
    }

    getNavigationHistory(frameId?: string): string[] {
        const targetFrameId = frameId ?? this.selected[0]?.frame.id;
        return targetFrameId ? this.navigationManager.getNavigationHistory(targetFrameId) : [];
    }

    addToHistory(path: string, frameId?: string): void {
        const targetFrameId = frameId ?? this.selected[0]?.frame.id;
        if (targetFrameId) {
            this.navigationManager.addToHistory(targetFrameId, path);
        }
    }

    async goBack(frameId?: string): Promise<void> {
        const targetFrameId = frameId ?? this.selected[0]?.frame.id;
        if (!targetFrameId) {
            console.warn('No frame selected for navigation');
            return;
        }

        const previousPath = this.navigationManager.goBack(targetFrameId);
        console.log('goBack', previousPath);

        if (previousPath) {
            await this.navigateToPath(targetFrameId, previousPath, false);
        }
    }

    async goForward(frameId?: string): Promise<void> {
        const targetFrameId = frameId ?? this.selected[0]?.frame.id;
        if (!targetFrameId) {
            console.warn('No frame selected for navigation');
            return;
        }

        const nextPath = this.navigationManager.goForward(targetFrameId);
        console.log('goForward', nextPath);
        if (nextPath) {
            await this.navigateToPath(targetFrameId, nextPath, false);
        }
    }

    private async navigateToPath(
        frameId: string,
        path: string,
        addToHistory = true,
    ): Promise<void> {
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

            frameData.view.loadURL(`${baseUrl}${path}`);

            // Update pages manager active path
            this.editorEngine.pages.setActivePath(frameId, path);
            await frameData.view.processDom();

            this.editorEngine.posthog.capture('page_navigate', {
                path,
            });

            // Add to navigation history
            if (addToHistory) {
                this.addToHistory(path, frameId);
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
            this._frameIdToData.delete(id);
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
            this._frameIdToData.set(frameId, { ...existingFrame, frame: newFrame });
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
