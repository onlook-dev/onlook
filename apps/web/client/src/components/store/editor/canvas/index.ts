import { DefaultSettings } from '@onlook/constants';
import type { Canvas, Frame, RectPosition, WebFrame } from '@onlook/models';
import { FrameType } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectManager } from '../../project/manager';
import { FrameImpl, WebFrameImpl } from './frame';

type SettingsObserver = (settings: Frame) => void;

export class CanvasManager {
    private _scale: number = DefaultSettings.SCALE;
    private _position: RectPosition = DefaultSettings.PAN_POSITION;
    private _frames: FrameImpl[] = [];
    private settingsObservers: Map<string, Set<SettingsObserver>> = new Map();

    constructor(private projects: ProjectManager) {
        this._position = this.getDefaultPanPosition();
        makeAutoObservable(this);
    }

    applyCanvas(canvas: Canvas) {
        this.scale = canvas.scale ?? DefaultSettings.SCALE;
        this.position = canvas.position ?? this.getDefaultPanPosition();
    }

    applyFrames(frames: Frame[]) {
        this.frames = frames.map((frame) => {
            if (frame.type === FrameType.WEB) {
                return WebFrameImpl.fromJSON(frame as WebFrame);
            } else {
                return FrameImpl.fromJSON(frame);
            }
        });
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

    get frames() {
        return this._frames;
    }

    set frames(frames: FrameImpl[]) {
        this._frames = frames;
    }

    getFrame(id: string) {
        return this.frames.find((f) => f.id === id);
    }

    saveFrame(id: string, newFrame: Partial<Frame>) {
        let frame = this.frames.find((f) => f.id === id);
        if (!frame) {
            return;
        }

        frame = { ...frame, ...newFrame };
        this.frames = this.frames.map((f) => (f.id === id ? frame : f));
        this.saveSettings();
    }

    saveFrames(newFrames: Frame[]) {
        this.frames = newFrames;
        this.saveSettings();
    }

    clear() {
        this.frames = [];
        this._scale = DefaultSettings.SCALE;
        this._position = DefaultSettings.PAN_POSITION;
    }

    getFrameMap(frames: Frame[]): Map<string, Frame> {
        const map = new Map<string, Frame>();
        frames.forEach((frame) => {
            map.set(frame.id, frame);
        });
        return map;
    }

    getDefaultFrame(defaults: Partial<Frame>): Frame {
        return {
            id: defaults.id ?? uuidv4(),
            position: defaults.position ?? DefaultSettings.FRAME_POSITION,
            dimension: defaults.dimension ?? DefaultSettings.FRAME_DIMENSION,
            type: FrameType.WEB,
            windowMetadata: defaults.windowMetadata ?? {},
        };
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
        // TODO: Save settings in persistence
        if (this.projects.project) {
            this.projects.updateProject(this.projects.project);
        }
    }
}
