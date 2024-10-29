import type { ProjectsManager } from '@/lib/projects';
import { debounce } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid';
import { DefaultSettings } from '/common/constants';
import type {
    FrameSettings,
    Project,
    ProjectSettings,
    RectDimension,
    RectPosition,
} from '/common/models/project';

export class CanvasManager {
    private zoomScale: number = DefaultSettings.SCALE;
    private panPosition: RectPosition = DefaultSettings.POSITION;
    private webFrames: FrameSettings[] = [];

    constructor(private projects: ProjectsManager) {
        makeAutoObservable(this);
        this.listenToProjectChange();
        this.panPosition = this.getDefaultPanPosition();
    }

    getDefaultPanPosition(): RectPosition {
        if (!window) {
            return DefaultSettings.POSITION;
        }

        const x =
            window.innerWidth / 2 - (DefaultSettings.FRAME_DIMENSION.width * this.zoomScale) / 2;
        const y =
            window.innerHeight / 2 - (DefaultSettings.FRAME_DIMENSION.height * this.zoomScale) / 2;
        return { x, y };
    }

    listenToProjectChange() {
        reaction(
            () => this.projects.project,
            (project) => {
                project && this.applySettings(project);
            },
        );
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
        return this.webFrames;
    }

    set frames(frames: FrameSettings[]) {
        this.webFrames = frames;
        this.saveSettings();
    }

    saveFrame(
        id: string,
        newSettings: {
            url?: string;
            position?: RectPosition;
            dimension?: RectDimension;
        },
    ) {
        let frame = this.webFrames.find((f) => f.id === id);
        if (!frame) {
            return;
        }

        frame = { ...frame, ...newSettings };
        this.webFrames = this.webFrames.map((f) => (f.id === id ? frame : f));
        this.saveSettings();
    }

    async applySettings(project: Project) {
        this.zoomScale = project.settings?.scale || DefaultSettings.SCALE;
        this.panPosition = project.settings?.position || this.getDefaultPanPosition();
        this.webFrames =
            project.settings?.frames && project.settings.frames.length
                ? project.settings.frames
                : [this.getDefaultFrame({ url: project.url })];
    }

    clear() {
        this.webFrames = [];
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
        const settings: ProjectSettings = {
            scale: this.zoomScale,
            position: this.panPosition,
            frames: Array.from(this.frames.values()),
        };

        if (this.projects.project) {
            this.projects.project.settings = settings;
            this.projects.updateProject(this.projects.project);
        }
    }
}
