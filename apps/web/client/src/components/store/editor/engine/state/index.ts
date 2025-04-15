import { sendAnalytics } from "@/utils/analytics";
import { type BrandTabValue, EditorMode, EditorTabValue, type LeftPanelTabValue, SettingsTabValue } from "@onlook/models";
import { debounce } from "lodash";
import { makeAutoObservable } from "mobx";

export class StateManager {
    private _plansOpen = false;
    settingsOpen = false;
    hotkeysOpen = false;
    publishOpen = false;
    leftPanelLocked = false;
    private _canvasScrolling = false;
    canvasPanning = false;

    editorMode: EditorMode = EditorMode.DESIGN;
    settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;

    leftPanelTab: LeftPanelTabValue | null = null;
    rightPanelTab: EditorTabValue = EditorTabValue.CHAT;
    brandTab: BrandTabValue | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get canvasScrolling() {
        return this._canvasScrolling;
    }

    set canvasScrolling(value: boolean) {
        this._canvasScrolling = value;
        this.resetCanvasScrolling();
    }

    resetCanvasScrolling() {
        this.resetCanvasScrollingDebounced();
    }

    get shouldHideOverlay() {
        return this.canvasScrolling || this.canvasPanning;
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

    private resetCanvasScrollingDebounced = debounce(() => {
        this.canvasScrolling = false;
    }, 150);

    dispose() {
        this.plansOpen = false;
        this.settingsOpen = false;
        this.hotkeysOpen = false;
        this.publishOpen = false;
        this.resetCanvasScrollingDebounced.cancel();
    }
}
