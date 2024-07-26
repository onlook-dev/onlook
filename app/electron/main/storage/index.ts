import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { UserSettings } from '/common/models/settings';

const path = app.getPath('userData');
const settingsPath = `${path}/user-settings.json`;

export function writeUserSettings(config: UserSettings) {
    const userData = JSON.stringify(config);
    writeFileSync(settingsPath, userData);
}

export function readUserSettings(): UserSettings {
    if (!existsSync(settingsPath)) {
        return {};
    }

    const content = readFileSync(settingsPath, 'utf8');
    console.log('Reading user settings:', content);
    return JSON.parse(content || '') as UserSettings;
}
