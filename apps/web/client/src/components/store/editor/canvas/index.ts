import { api } from '@/trpc/client';
import { DefaultSettings } from '@onlook/constants';
import type { Canvas, RectPosition } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class CanvasManager {
    private _id: string = '';
    private _scale: number = DefaultSettings.SCALE;
    private _position: RectPosition = DefaultSettings.PAN_POSITION;

    constructor(private readonly editorEngine: EditorEngine) {
        this._position = this.getDefaultPanPosition();
        makeAutoObservable(this);
    }

    applyCanvas(canvas: Canvas) {
        this.id = canvas.id;
        this.scale = canvas.scale ?? DefaultSettings.SCALE;
        this.position = canvas.position ?? this.getDefaultPanPosition();
    }

    getDefaultPanPosition(): RectPosition {
        let x = 200;
        let y = 100;
        const center = false;
        if (center) {
            x = window.innerWidth / 2 - (DefaultSettings.FRAME_DIMENSION.width * this._scale) / 2;
            y = window.innerHeight / 2 - (DefaultSettings.FRAME_DIMENSION.height * this._scale) / 2;
        }

        return { x, y };
    }

    get id() {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    get scale() {
        return this._scale;
    }

    set scale(value: number) {
        this._scale = value;
        this.saveCanvas();
    }

    get position() {
        return this._position;
    }

    set position(value: RectPosition) {
        this._position = value;
        this.saveCanvas();
    }

    // 5 second debounce. Database is used to save working state per user, so we don't need to save too often.
    saveCanvas = debounce(this.undebouncedSaveCanvas, 5000);

    private async undebouncedSaveCanvas() {
        const success = await api.userCanvas.update.mutate({
            projectId: this.editorEngine.projectId,
            canvasId: this.id,
            canvas: {
                scale: this.scale.toString(),
                x: this.position.x.toString(),
                y: this.position.y.toString(),
            },
        });
        if (!success) {
            console.error('Failed to update canvas');
        }
    }

    clear() {
        this._scale = DefaultSettings.SCALE;
        this._position = DefaultSettings.PAN_POSITION;
    }
}
