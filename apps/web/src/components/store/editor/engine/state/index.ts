import { EditorMode, EditorTabValue, SettingsTabValue } from "@onlook/models";
import { makeAutoObservable } from "mobx";
import type { EditorEngine } from "..";

export class StateManager {
    private _plansOpen: boolean = false;
    private settingsOpen: boolean = false;
    private hotkeysOpen: boolean = false;
    private publishOpen: boolean = false;
    private editorMode: EditorMode = EditorMode.DESIGN;
    private editorPanelTab: EditorTabValue = EditorTabValue.CHAT;
    private settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get plansOpen() {
        return this._plansOpen;
    }
    set plansOpen(open: boolean) {
        this._plansOpen = open;
        if (open) {
            // sendAnalytics('open pro checkout');
        }
    }

    dispose() {
        this.plansOpen = false;
        this.settingsOpen = false;
        this.hotkeysOpen = false;
        this.publishOpen = false;
    }
}
