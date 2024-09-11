import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { DefaultSettings, MainChannels } from '/common/constants';
import {
    FrameSettings,
    ProjectSettings,
    RectDimension,
    RectPosition,
} from '/common/models/settings';

export class CanvasManager {
    private zoomScale: number = DefaultSettings.SCALE;
    private panPosition: RectPosition = DefaultSettings.POSITION;
    private idToFrame: Map<string, FrameSettings> = new Map();

    constructor() {
        makeAutoObservable(this);
        this.restoreSettings();
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

    restoreSettings() {
        window.api.invoke(MainChannels.GET_PROJECT_SETTINGS).then((res) => {
            const settings: ProjectSettings = res as ProjectSettings;
            this.scale = settings.scale || DefaultSettings.SCALE;
            this.position = settings.position || DefaultSettings.POSITION;
            this.idToFrame = this.getFrameMap(
                settings.frames && settings.frames.length
                    ? settings.frames
                    : [this.getDefaultFrame()],
            );
        });
    }

    getFrameMap(frames: FrameSettings[]): Map<string, FrameSettings> {
        const map = new Map<string, FrameSettings>();
        frames.forEach((frame) => {
            map.set(frame.id, frame);
        });
        return map;
    }

    getDefaultFrame(): FrameSettings {
        return {
            id: nanoid(),
            url: DefaultSettings.URL,
            position: DefaultSettings.FRAME_POSITION,
            dimension: DefaultSettings.FRAME_DIMENSION,
        };
    }

    saveSettings = debounce(this.undebouncedSaveSettings, 1000);

    private undebouncedSaveSettings() {
        const settings: ProjectSettings = {
            scale: this.zoomScale,
            position: this.panPosition,
            frames: Array.from(this.frames.values()),
        };
        window.api.invoke(
            MainChannels.UPDATE_PROJECT_SETTINGS,
            JSON.parse(JSON.stringify(settings)),
        );
    }

    private clearSettings() {
        const settings: ProjectSettings = {};
        window.api.invoke(
            MainChannels.UPDATE_PROJECT_SETTINGS,
            JSON.parse(JSON.stringify(settings)),
        );
    }
}
