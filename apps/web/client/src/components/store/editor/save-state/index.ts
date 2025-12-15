import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '@/components/store/editor/engine';

export type SaveState = 'saved' | 'saving' | 'unsaved';

export class SaveStateManager {
    saveState: SaveState = 'saved';
    private saveTimeout: NodeJS.Timeout | null = null;
    private lastSaveTime: number = Date.now();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    /**
     * Mark that a save operation has started
     */
    startSaving() {
        this.saveState = 'saving';
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    /**
     * Mark that a save operation has completed successfully
     */
    completeSave() {
        this.saveState = 'saved';
        this.lastSaveTime = Date.now();
    }

    /**
     * Mark that there are unsaved changes
     */
    markUnsaved() {
        // Only mark as unsaved if we're not currently saving
        if (this.saveState !== 'saving') {
            this.saveState = 'unsaved';
        }
    }

    /**
     * Debounced save completion - waits for a brief period after save
     * to ensure no additional writes are happening
     */
    debouncedCompleteSave(delay: number = 300) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.completeSave();
            this.saveTimeout = null;
        }, delay);
    }

    /**
     * Get time since last save in seconds
     */
    get timeSinceLastSave(): number {
        return Math.floor((Date.now() - this.lastSaveTime) / 1000);
    }

    /**
     * Get formatted time since last save (e.g., "2 seconds ago", "1 minute ago")
     */
    get formattedTimeSinceLastSave(): string {
        const seconds = this.timeSinceLastSave;
        if (seconds < 60) {
            return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
        }
        const minutes = Math.floor(seconds / 60);
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }

    clear() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.saveState = 'saved';
    }
}
