import { api } from '@/trpc/client';
import { DefaultSettings } from '@onlook/constants';
import { fromCanvas } from '@onlook/db';
import { RealtimeEventType, type Canvas, type Frame, type RectPosition } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { ProjectManager } from '../../project/manager';
import type { EditorEngine } from '../engine';
import type { UserManager } from '../../user/manager';

type SettingsObserver = (settings: Frame) => void;

export class CanvasManager {
    private _id: string = '';
    private _scale: number = DefaultSettings.SCALE;
    private _position: RectPosition = DefaultSettings.PAN_POSITION;
    private settingsObservers: Map<string, Set<SettingsObserver>> = new Map();

    constructor(
        private editorEngine: EditorEngine,
        private projects: ProjectManager,
        private userManager: UserManager,
    ) {
        this._position = this.getDefaultPanPosition();
        makeAutoObservable(this);
    }

    applyCanvas(canvas: Canvas) {
        this.id = canvas.id;
        this.scale = canvas.scale ?? DefaultSettings.SCALE;
        this.position = canvas.position ?? this.getDefaultPanPosition();

        if (this.userManager.user) {
            this.editorEngine.realtime.send({
                event: RealtimeEventType.USER_UPDATED,
                payload: {
                    ...this.userManager.user,
                    position: {
                        x: this.position.x,
                        y: this.position.y,
                    },
                },
            });
        }
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
        this.saveSettings();
    }

    get position() {
        return this._position;
    }

    set position(value: RectPosition) {
        this._position = value;
        this.saveSettings();
    }

    async updateCanvas(canvas: Canvas) {
        const success = await api.userCanvas.update.mutate(fromCanvas(canvas));
        if (!success) {
            console.error('Failed to update canvas');
        }

        if (this.userManager.user) {
            this.editorEngine.realtime.send({
                event: RealtimeEventType.USER_UPDATED,
                payload: {
                    ...this.userManager.user,
                    position: {
                        x: this.position.x,
                        y: this.position.y,
                    },
                },
            });
        }
    }

    clear() {
        this._scale = DefaultSettings.SCALE;
        this._position = DefaultSettings.PAN_POSITION;
    }

    saveSettings = debounce(this.undebouncedSaveSettings, 1000);

    observeSettings(id: string, observer: SettingsObserver): void {
        if (!this.settingsObservers.has(id)) {
            this.settingsObservers.set(id, new Set());
        }
        this.settingsObservers.get(id)!.add(observer);
    }

    unobserveSettings(id: string, observer: SettingsObserver): void {
        this.settingsObservers.get(id)?.delete(observer);
        if (this.settingsObservers.get(id)?.size === 0) {
            this.settingsObservers.delete(id);
        }
    }

    private undebouncedSaveSettings() {
        if (this.projects.project) {
            this.updateCanvas({
                id: this.id,
                position: this.position,
                scale: this.scale,
            });
        }
    }
}
