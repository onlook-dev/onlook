import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { DEFAULT_SCALE, MainChannels } from '/common/constants';
import { ProjectPosition, ProjectSettings } from '/common/models/settings';

export class CanvasManager {
    public zoomScale: number = DEFAULT_SCALE;
    public frames: any[] = [];
    public position: ProjectPosition = { x: 0, y: 0 };

    constructor() {
        makeAutoObservable(this);
        this.restoreSettings();
    }

    restoreSettings() {
        window.api.invoke(MainChannels.GET_PROJECT_SETTINGS).then((res) => {
            const settings: ProjectSettings = res as ProjectSettings;
            console.log('Settings', settings);
            this.scale = settings.scale || DEFAULT_SCALE;
        });
    }

    get scale() {
        return this.zoomScale;
    }

    set scale(value: number) {
        this.zoomScale = value;
        this.saveSettigns();
    }

    saveSettigns = debounce(this.undebouncedSaveSettings, 1000);

    private undebouncedSaveSettings() {
        console.log('Saving settings', this.zoomScale);
        window.api.invoke(MainChannels.UPDATE_PROJECT_SETTINGS, {
            scale: this.zoomScale,
        });
    }
}
