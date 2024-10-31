import { MainChannels } from '@onlook/models/constants';

export const platformSlash = window.env.PLATFORM === 'win32' ? '\\' : '/';

export function sendAnalytics(event: string, data?: Record<string, any>) {
    window.api.send(MainChannels.SEND_ANALYTICS, { event, data });
}

export const isMetaKey = (e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>) =>
    process.platform === 'darwin' ? e.metaKey : e.ctrlKey;

export function getTruncatedFileName(fileName: string) {
    const parts = fileName.split(platformSlash);
    return parts[parts.length - 1];
}

export const getRunProjectCommand = (folderPath: string) => {
    const platformCommand = process.platform === 'win32' ? 'cd /d' : 'cd';
    return `${platformCommand} ${folderPath} && npm run dev`;
};
