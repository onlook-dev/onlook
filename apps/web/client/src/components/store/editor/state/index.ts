import { sendAnalytics } from '@/utils/analytics';
import {
    type BrandTabValue,
    EditorMode,
    EditorTabValue,
    type LeftPanelTabValue,
    SettingsTabValue,
} from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';

export class StateManager {
    private _plansOpen = false;
    private _canvasScrolling = false;
    settingsOpen = false;
    hotkeysOpen = false;
    publishOpen = false;
    leftPanelLocked = false;
    canvasPanning = false;

    editorMode: EditorMode = EditorMode.DESIGN;
    settingsTab: SettingsTabValue | string = SettingsTabValue.PREFERENCES;

    leftPanelTab: LeftPanelTabValue | null = null;
    rightPanelTab: EditorTabValue = EditorTabValue.CHAT;
    brandTab: BrandTabValue | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    set canvasScrolling(value: boolean) {
        this._canvasScrolling = value;
        this.resetCanvasScrolling();
    }

    get shouldHideOverlay() {
        return this._canvasScrolling || this.canvasPanning;
    }

    get plansOpen() {
        return this._plansOpen;
    }

    set plansOpen(open: boolean) {
        this._plansOpen = open;
        if (open) {
            sendAnalytics('open pro checkout');
        }
    }

    private resetCanvasScrolling() {
        this.resetCanvasScrollingDebounced();
    }

    private resetCanvasScrollingDebounced = debounce(() => {
        this.canvasScrolling = false;
    }, 150);

    clear() {
        this.plansOpen = false;
        this.settingsOpen = false;
        this.hotkeysOpen = false;
        this.publishOpen = false;
        this.resetCanvasScrollingDebounced.cancel();
    }
}
