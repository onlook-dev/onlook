import { sendAnalytics } from "@/utils/analytics";
import { type BrandTabValue, EditorMode, EditorTabValue, type LayersPanelTabValue, SettingsTabValue } from "@onlook/models";
import { makeAutoObservable } from "mobx";
export class StateManager {
    private _plansOpen = false;
    settingsOpen = false;
    hotkeysOpen = false;
    publishOpen = false;
    leftPanelLocked = false;

    editorMode: EditorMode = EditorMode.DESIGN;
    editorPanelTab: EditorTabValue = EditorTabValue.CHAT;
    settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;
    layersPanelTab: LayersPanelTabValue | null = null;
    brandTab: BrandTabValue | null = null;

    constructor() {
        makeAutoObservable(this);
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

    dispose() {
        this.plansOpen = false;
        this.settingsOpen = false;
        this.hotkeysOpen = false;
        this.publishOpen = false;
    }
}
