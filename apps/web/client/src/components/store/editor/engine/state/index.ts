import { sendAnalytics } from "@/utils/analytics";
import { type BrandTabValue, EditorMode, EditorTabValue, type LeftPanelTabValue, SettingsTabValue } from "@onlook/models";
import { makeAutoObservable } from "mobx";
export class StateManager {
    private _plansOpen = false;
    settingsOpen = false;
    hotkeysOpen = false;
    publishOpen = false;
    leftPanelLocked = false;

    editorMode: EditorMode = EditorMode.DESIGN;
    settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;

    leftPanelTab: LeftPanelTabValue | null = null;
    rightPanelTab: EditorTabValue = EditorTabValue.CHAT;
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
