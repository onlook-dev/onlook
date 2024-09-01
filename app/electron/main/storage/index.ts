import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { UserSettings } from '/common/models/settings';

const path = app.getPath('userData');
const settingsPath = `${path}/user-settings.json`;

export function updateUserSettings(settings: UserSettings) {
    const userSettings = readUserSettings();
    writeUserSettings({ ...userSettings, ...settings });
}

export function writeUserSettings(settings: UserSettings) {
    const userData = JSON.stringify(settings);
    writeFileSync(settingsPath, userData);
}

export function readUserSettings(): UserSettings {
    if (!existsSync(settingsPath)) {
        return {};
    }

    const content = readFileSync(settingsPath, 'utf8');
    return JSON.parse(content || '') as UserSettings;
}
