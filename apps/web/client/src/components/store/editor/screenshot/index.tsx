import { api } from '@/trpc/client';
import { isAfter, subMinutes } from 'date-fns';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class ScreenshotManager {
    _lastScreenshotTime: Date | null = null;
    isCapturing = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get lastScreenshotAt() {
        return this._lastScreenshotTime;
    }

    set lastScreenshotAt(time: Date | null) {
        this._lastScreenshotTime = time;
    }

    // 10 second debounce
    captureScreenshot = debounce(
        this.debouncedCaptureScreenshot,
        10000,
    );

    private async debouncedCaptureScreenshot() {
        if (this.isCapturing) {
            return;
        }
        this.isCapturing = true;
        try {
            // If the screenshot was captured less than 30 minutes ago, skip capturing
            if (this.lastScreenshotAt) {
                const thirtyMinutesAgo = subMinutes(new Date(), 30);
                if (isAfter(this.lastScreenshotAt, thirtyMinutesAgo)) {
                    return;
                }
            }
            const result = await api.project.captureScreenshot.mutate({ projectId: this.editorEngine.projectId });
            if (!result || !result.success) {
                throw new Error('Failed to capture screenshot');
            }
            this.lastScreenshotAt = new Date();
        } catch (error) {
            console.error('Error capturing screenshot', error);
        } finally {
            this.isCapturing = false;
        }
    }

    clear() {
        this.lastScreenshotAt = null;
    }
}
