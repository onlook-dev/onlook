import type { ProjectsManager } from '@/lib/projects';
import { SIZE_PRESETS } from '@/lib/sizePresets';
import { DefaultSettings } from '@onlook/models/constants';
import type {
    FrameSettings,
    Project,
    ProjectSettings,
    RectPosition,
} from '@onlook/models/projects';
import { debounce } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid/non-secure';

type SettingsObserver = (settings: FrameSettings) => void;

export class CanvasManager {
    private zoomScale: number = DefaultSettings.SCALE;
    private panPosition: RectPosition = DefaultSettings.PAN_POSITION;
    private webFrames: FrameSettings[] = [];
    private settingsObservers: Map<string, Set<SettingsObserver>> = new Map();

    constructor(private projects: ProjectsManager) {
        makeAutoObservable(this);
        this.listenToProjectChange();
        this.panPosition = this.getDefaultPanPosition();
    }

    getDefaultPanPosition(): RectPosition {
        if (!window) {
            return DefaultSettings.PAN_POSITION;
        }

        let x = 200;
        let y = 100;
        const center = false;
        if (center) {
            x =
                window.innerWidth / 2 -
                (DefaultSettings.FRAME_DIMENSION.width * this.zoomScale) / 2;
            y =
                window.innerHeight / 2 -
                (DefaultSettings.FRAME_DIMENSION.height * this.zoomScale) / 2;
        }

        return { x, y };
    }

    listenToProjectChange() {
        reaction(
            () => this.projects.project,
            (project) => {
                if (project) {
                    this.applySettings(project);
                }
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

    getFrame(id: string) {
        return this.webFrames.find((f) => f.id === id);
    }

    saveFrame(id: string, newSettings: Partial<FrameSettings>) {
        let frame = this.webFrames.find((f) => f.id === id);
        if (!frame) {
            return;
        }

        frame = { ...frame, ...newSettings };
        this.webFrames = this.webFrames.map((f) => (f.id === id ? frame : f));
        this.saveSettings();
        this.notifySettingsObservers(id);
    }

    async applySettings(project: Project) {
        this.zoomScale = project.settings?.scale || DefaultSettings.SCALE;
        this.panPosition = project.settings?.position || this.getDefaultPanPosition();

        if (project.settings?.frames && project.settings.frames.length) {
            this.webFrames = project.settings.frames;
        } else {
            // Find desktop and mobile presets
            const desktopPreset = SIZE_PRESETS.find((preset) => preset.name === 'Desktop');
            const mobilePreset = SIZE_PRESETS.find((preset) => preset.name === 'Mobile');

            // Create desktop frame
            const desktopFrame = this.getDefaultFrame({
                url: project.url,
                dimension: desktopPreset
                    ? { width: desktopPreset.width, height: desktopPreset.height }
                    : DefaultSettings.FRAME_DIMENSION,
                device: 'Desktop',
            });

            // Create mobile frame with position offset to avoid overlap
            const mobileFrame = this.getDefaultFrame({
                url: project.url,
                dimension: mobilePreset
                    ? { width: mobilePreset.width, height: mobilePreset.height }
                    : { width: 320, height: 568 },
                position: { x: desktopFrame.dimension.width + 100, y: 0 },
                device: 'Mobile',
            });

            this.webFrames = [desktopFrame, mobileFrame];
        }
    }

    clear() {
        this.webFrames = [];
        this.zoomScale = DefaultSettings.SCALE;
        this.panPosition = DefaultSettings.PAN_POSITION;
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
            aspectRatioLocked: defaults.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED,
            device: defaults.device || DefaultSettings.DEVICE,
            theme: defaults.theme || DefaultSettings.THEME,
            orientation: defaults.orientation || DefaultSettings.ORIENTATION,
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

    private notifySettingsObservers(id: string): void {
        const settings = this.frames.find((f) => f.id === id);
        if (!settings) {
            return;
        }

        this.settingsObservers.get(id)?.forEach((observer) => {
            observer(settings);
        });
    }

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
