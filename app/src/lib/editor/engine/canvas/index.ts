import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { DefaultSettings } from '/common/constants';
import {
    FrameSettings,
    Project,
    ProjectSettings,
    RectDimension,
    RectPosition,
} from '/common/models/project';

export class CanvasManager {
    private zoomScale: number = DefaultSettings.SCALE;
    private panPosition: RectPosition = DefaultSettings.POSITION;
    private idToFrame: Map<string, FrameSettings> = new Map();
    private saveSettingsCallback?: (settings: ProjectSettings) => void;

    constructor() {
        makeAutoObservable(this);
    }

    get scale() {
        return this.zoomScale;
    }

    set scale(value: number) {
        this.zoomScale = value;
        this.saveSettings();
    }

    get position() {
        return this.panPosition;
    }

    set position(value: RectPosition) {
        this.panPosition = value;
        this.saveSettings();
    }

    get frames() {
        return Array.from(this.idToFrame.values());
    }

    saveFrame(
        id: string,
        newSettings: {
            url?: string;
            position?: RectPosition;
            dimension?: RectDimension;
        },
    ) {
        let frame = this.idToFrame.get(id);
        if (!frame) {
            return;
        }

        frame = { ...frame, ...newSettings };
        this.idToFrame.set(id, frame);
        this.saveSettings();
    }

    async applySettings(
        project: Project,
        saveSettingsCallback?: (settings: ProjectSettings) => void,
    ) {
        this.saveSettingsCallback = saveSettingsCallback;
        this.zoomScale = project.settings?.scale || DefaultSettings.SCALE;
        this.panPosition = project.settings?.position || DefaultSettings.POSITION;
        this.idToFrame = this.getFrameMap(
            project.settings?.frames && project.settings.frames.length
                ? project.settings.frames
                : [this.getDefaultFrame({ url: project.url })],
        );
    }

    clear() {
        this.idToFrame.clear();
        this.zoomScale = DefaultSettings.SCALE;
        this.panPosition = DefaultSettings.POSITION;
    }

    getFrameMap(frames: FrameSettings[]): Map<string, FrameSettings> {
        const map = new Map<string, FrameSettings>();
        frames.forEach((frame) => {
            map.set(frame.id, frame);
        });
        return map;
    }

    getDefaultFrame(defaults: Partial<FrameSettings>): FrameSettings {
        return {
            id: defaults.id || nanoid(),
            url: defaults.url || DefaultSettings.URL,
            position: defaults.position || DefaultSettings.FRAME_POSITION,
            dimension: defaults.dimension || DefaultSettings.FRAME_DIMENSION,
        };
    }

    saveSettings = debounce(this.undebouncedSaveSettings, 1000);

    private undebouncedSaveSettings() {
        if (!this.saveSettingsCallback) {
            return;
        }
        const settings: ProjectSettings = {
            scale: this.zoomScale,
            position: this.panPosition,
            frames: Array.from(this.frames.values()),
        };
        this.saveSettingsCallback(settings);
    }
}
