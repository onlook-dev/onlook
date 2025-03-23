import { app } from 'electron';
import path from 'path';
import { PersistentStorage } from '../storage';

export function getDefaultCreateProjectPath() {
    const documentsPath = app.getPath('documents');
    const projectsPath = path.join(documentsPath, 'Onlook', 'Projects');
    return projectsPath;
}

export function getCreateProjectPath() {
    const userSettings = PersistentStorage.USER_SETTINGS.read();
    return userSettings?.editor?.newProjectPath || getDefaultCreateProjectPath();
}
