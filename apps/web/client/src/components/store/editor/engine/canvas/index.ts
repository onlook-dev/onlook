import { DefaultSettings } from '@onlook/constants';
import type {
    Frame,
    Project,
    RectPosition,
    WebFrame
} from '@onlook/models';
import { FrameType } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import { FrameImpl, WebFrameImpl } from './frame';

export class CanvasManager {
    private _scale: number = DefaultSettings.SCALE;
    private _position: RectPosition = DefaultSettings.PAN_POSITION;
    private _frames: FrameImpl[] = [];

    constructor() {
        makeAutoObservable(this);
        this._position = this.getDefaultPanPosition();
    }

    applyProject(project: Project) {
        this.scale = project.canvas?.scale ?? DefaultSettings.SCALE;
        this.position = project.canvas?.position ?? this.getDefaultPanPosition();
        this.applyFrames(project.canvas?.frames ?? []);
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
            x =
                window.innerWidth / 2 -
                (DefaultSettings.FRAME_DIMENSION.width * this._scale) / 2;
            y =
                window.innerHeight / 2 -
                (DefaultSettings.FRAME_DIMENSION.height * this._scale) / 2;
        }

        return { x, y };
    }

    get scale() {
        return this._scale;
    }

    set scale(value: number) {
        this._scale = value;
        // this.saveSettings();
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

    saveFrame(id: string, newSettings: Partial<Frame>) {
        // let frame = this.frames.find((f) => f.id === id);
        // if (!frame) {
        //     return;
        // }

        // frame = { ...frame, ...newSettings };
        // this.frames = this.frames.map((f) => (f.id === id ? frame : f));
        // this.saveSettings();
    }

    saveFrames(frames: Frame[]) {
        // this.frames = frames;
        // this.saveSettings();
    }

    async applySettings(project: Project) {
        // this.zoomScale = project.settings?.scale || DefaultSettings.SCALE;
        // this.panPosition = project.settings?.position || this.getDefaultPanPosition();

        // if (project.settings?.frames && project.settings.frames.length) {
        //     this.frames = project.settings.frames;
        // } else {
        //     // Find desktop and mobile presets
        //     const desktopPreset = SIZE_PRESETS.find((preset) => preset.name === 'Desktop');
        //     const mobilePreset = SIZE_PRESETS.find((preset) => preset.name === 'Mobile');

        //     // Create desktop frame
        //     const desktopFrame = this.getDefaultFrame({
        //         url: project.url,
        //         dimension: desktopPreset
        //             ? { width: desktopPreset.width, height: desktopPreset.height }
        //             : DefaultSettings.FRAME_DIMENSION,
        //         device: 'Desktop',
        //     });

        //     // Create mobile frame with position offset to avoid overlap
        //     const mobileFrame = this.getDefaultFrame({
        //         url: project.url,
        //         dimension: mobilePreset
        //             ? { width: mobilePreset.width, height: mobilePreset.height }
        //             : { width: 320, height: 568 },
        //         position: { x: desktopFrame.dimension.width + 100, y: 0 },
        //         device: 'Mobile',
        //     });

        //     this.frames = [desktopFrame, mobileFrame];
        // }
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
            id: defaults.id ?? nanoid(),
            position: defaults.position ?? DefaultSettings.FRAME_POSITION,
            dimension: defaults.dimension ?? DefaultSettings.FRAME_DIMENSION,
            type: FrameType.WEB,
        };
    }

    saveSettings = debounce(this.undebouncedSaveSettings, 1000);

    private undebouncedSaveSettings() {
        // const settings: ProjectSettings = {
        //     scale: this.zoomScale,
        //     position: this.panPosition,
        //     frames: Array.from(this.frames.values()),
        // };

        // if (this.projects.project) {
        //     this.projects.project.settings = settings;
        //     this.projects.updateProject(this.projects.project);
        // }
    }
}
