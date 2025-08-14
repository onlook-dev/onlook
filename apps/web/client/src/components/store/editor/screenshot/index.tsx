import { api } from '@/trpc/client';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class ScreenshotManager {
    _lastScreenshotTime: Date | null = null;
    isCapturing = false;
    readonly cooldownTime = 30 * 60 * 1000; // 30 minutes

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get lastScreenshotAt() {
        return this._lastScreenshotTime;
    }

    set lastScreenshotAt(time: Date | null) {
        this._lastScreenshotTime = time;
    }

    // 5 minute debounce
    captureScreenshot = debounce(
        this.debouncedCaptureScreenshot,
        5 * 60 * 1000,
        {
            leading: true,
            trailing: false,
        },
    );

    private async debouncedCaptureScreenshot() {
        if (this.isCapturing) {
            return;
        }
        // If the screenshot was captured less than 30 minutes ago, skip capturing

        if (this.lastScreenshotAt) {
            const lastScreenshotTime = new Date(this.lastScreenshotAt);
            const thirtyMinutesAgo = new Date(Date.now() - this.cooldownTime);
            if (lastScreenshotTime > thirtyMinutesAgo) {
                return;
            }
        }

        this.isCapturing = true;

        const screenshot = await api.project.captureScreenshot.mutate({ projectId: this.editorEngine.projectId });
        if (!screenshot) {
            return;
        }
        this.lastScreenshotAt = new Date();
        this.isCapturing = false;
    }

    clear() {
        this.lastScreenshotAt = null;
    }
}
