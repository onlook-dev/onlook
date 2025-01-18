import { DefaultSettings, MainChannels, WebviewChannels } from '@onlook/models/constants';
import { jsonClone } from '@onlook/utility';
import type { WebviewTag } from 'electron/renderer';
import { customAlphabet } from 'nanoid/non-secure';
import { VALID_DATA_ATTR_CHARS } from '/common/helpers/ids';

export const platformSlash = window.env.PLATFORM === 'win32' ? '\\' : '/';

export function sendAnalytics(event: string, data?: Record<string, any>) {
    try {
        window.api.send(MainChannels.SEND_ANALYTICS, { event, data });
    } catch (e) {
        console.error('Error sending analytics', e);
    }
}

export const sendAnalyticsError = (event: string, data?: Record<string, any>) => {
    window.api.send(MainChannels.SEND_ANALYTICS_ERROR, { event, data });
};

export const isMetaKey = (e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>) =>
    process.platform === 'darwin' ? e.metaKey : e.ctrlKey;

export function getTruncatedFileName(fileName: string) {
    const parts = fileName.split(platformSlash);
    return parts[parts.length - 1];
}

export const getRunProjectCommand = (folderPath: string) => {
    const platformCommand = process.platform === 'win32' ? 'cd /d' : 'cd';
    return `${platformCommand} ${folderPath} && ${DefaultSettings.COMMANDS.run}`;
};

export const invokeMainChannel = async <T, P>(channel: MainChannels, ...args: T[]): Promise<P> => {
    return window.api.invoke(channel, ...args.map(jsonClone));
};

export const sendToWebview = <T>(webview: WebviewTag, channel: WebviewChannels, ...args: T[]) => {
    return webview.send(channel, ...args.map(jsonClone));
};

const generateCustomId = customAlphabet(VALID_DATA_ATTR_CHARS, 7);
export function createDomId(): string {
    return `odid-${generateCustomId()}`;
}

export function createOid(): string {
    return `${generateCustomId()}`;
}
