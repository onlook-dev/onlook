import { api } from '@/trpc/client';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { getFileInfoFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';

export class ScreenshotManager {
    _lastScreenshotTime: Date | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get lastScreenshotTime() {
        return this._lastScreenshotTime;
    }

    setLastScreenshotTime(time: Date) {
        this._lastScreenshotTime = time;
    }

    async captureScreenshot() {
        // If the screenshot was captured less than 30 minutes ago, skip capturing

        if (this.lastScreenshotTime) {
            const lastScreenshotTime = new Date(this.lastScreenshotTime);
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            if (lastScreenshotTime > thirtyMinutesAgo) {
                return;
            }
        }

        const screenshot = await api.project.captureScreenshot.mutate({ projectId: this.editorEngine.projectId });
        if (!screenshot) {
            return;
        }
        this.setLastScreenshotTime(new Date());
    }

    async getProjectScreenshot() {
        const project = await api.project.get.query({ projectId: this.editorEngine.projectId });

        if (!project?.metadata.previewImg?.storagePath?.path) {
            return null;
        }
        const screenshot = await getFileInfoFromStorage(
            STORAGE_BUCKETS.PREVIEW_IMAGES,
            project.metadata.previewImg.storagePath?.path ?? '',
        );
        if (!screenshot?.lastModified) {
            return null;
        }
        this.setLastScreenshotTime(new Date(screenshot.lastModified));
    }

    clear() {
        this._lastScreenshotTime = null;
    }
}
