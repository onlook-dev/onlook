import { makeAutoObservable } from 'mobx';

export interface NavigationObject {
    history: string[];
    currentIndex: number;
}

export class FrameNavigationManager {
    private frameIdToNavigationObject = new Map<string, NavigationObject>();
    private maxHistorySize = 50;

    constructor() {
        makeAutoObservable(this);
    }

    registerFrame(frameId: string, framePathname: string): void {
        if (this.getNavigationHistory(frameId).length === 0) {
            this.addToHistory(frameId, framePathname);
        }
    }

    canGoBack(frameId: string): boolean {
        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        if (!navigationObject) {
            return false;
        }
        return navigationObject.currentIndex > 0;
    }

    canGoForward(frameId: string): boolean {
        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        if (!navigationObject) {
            return false;
        }
        return navigationObject.currentIndex < navigationObject.history.length - 1;
    }

    getHistoryLength(frameId: string): number {
        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        return navigationObject ? navigationObject.history.length : 0;
    }

    getCurrentHistoryIndex(frameId: string): number {
        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        return navigationObject ? navigationObject.currentIndex : -1;
    }

    getNavigationHistory(frameId: string): string[] {
        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        return navigationObject ? navigationObject.history : [];
    }

    addToHistory(frameId: string, path: string): void {
        const navigationObject = this.frameIdToNavigationObject.get(frameId) ?? {
            history: [],
            currentIndex: 0,
        };

        if (navigationObject.history[navigationObject.currentIndex] === path) {
            return;
        }

        // Remove forward history if we're not at the end
        if (navigationObject.currentIndex < navigationObject.history.length - 1) {
            navigationObject.history = navigationObject.history.slice(0, navigationObject.currentIndex + 1);
        }

        // Add new path to history if it's not the same as the previous path
        navigationObject.history.push(path);
        navigationObject.currentIndex = navigationObject.history.length - 1;

        // Trim history if it exceeds max size
        if (navigationObject.history.length > this.maxHistorySize) {
            navigationObject.history = navigationObject.history.slice(-this.maxHistorySize);
            navigationObject.currentIndex = navigationObject.history.length - 1;
        }

        this.frameIdToNavigationObject.set(frameId, navigationObject);
    }

    goBack(frameId: string): string | null {
        if (!this.canGoBack(frameId)) {
            return null;
        }

        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        if (!navigationObject) {
            return null;
        }

        const previousIndex = navigationObject.currentIndex - 1;

        if (previousIndex < 0 || previousIndex >= navigationObject.history.length) {
            return null;
        }

        navigationObject.currentIndex = previousIndex;
        return navigationObject.history[previousIndex] ?? null;
    }

    goForward(frameId: string): string | null {
        if (!this.canGoForward(frameId)) {
            return null;
        }

        const navigationObject = this.frameIdToNavigationObject.get(frameId);
        if (!navigationObject) {
            return null;
        }

        const nextIndex = navigationObject.currentIndex + 1;

        if (nextIndex < 0 || nextIndex >= navigationObject.history.length) {
            return null;
        }

        navigationObject.currentIndex = nextIndex;
        return navigationObject.history[nextIndex] ?? null;
    }

    clearHistory(frameId: string): void {
        this.frameIdToNavigationObject.delete(frameId);
    }

    clearAllHistory(): void {
        this.frameIdToNavigationObject.clear();
    }

    removeFrame(frameId: string): void {
        this.clearHistory(frameId);
    }
}
