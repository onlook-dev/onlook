import { app } from 'electron';
import path from 'path';

export function getCreateProjectPath() {
    const documentsPath = app.getPath('documents');
    const projectsPath = path.join(documentsPath, 'Onlook', 'Projects');
    return projectsPath;
}
