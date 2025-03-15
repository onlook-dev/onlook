import {
    DefaultSettings,
    MainChannels,
    WebviewChannels,
    type Channels,
} from '@onlook/models/constants';
import { jsonClone } from '@onlook/utility';
import imageCompression from 'browser-image-compression';
import type { WebviewTag } from 'electron/renderer';
import { customAlphabet, nanoid } from 'nanoid/non-secure';
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

export const invokeMainChannel = async <T, P>(channel: Channels, ...args: T[]): Promise<P> => {
    return window.api.invoke(channel, ...args.map(jsonClone));
};

export const streamFromMainChannel = <T, P>(
    channel: Channels,
    args: T,
    callback: (data: P | string, status?: 'partial' | 'complete' | 'error') => void
): Promise<{ streamId: string }> => {
    const streamId = nanoid();
    const streamChannel = `${channel}-stream-${streamId}` as Channels;
    
    // Register listener for stream events
    const listener = (data: any, type?: string) => {
        if (type === 'error') {
            callback(data as string, 'error');
            window.api.removeListener(streamChannel, listener);
        } else if (type === 'done') {
            callback(data as P, 'complete');
            window.api.removeListener(streamChannel, listener);
        } else {
            callback(data as P, 'partial');
        }
    };
    
    window.api.on(streamChannel, listener);
    
    // Invoke the channel with the streamId
    return invokeMainChannel(channel, { ...args, streamId });
};

export const abortStream = (channel: Channels, streamId: string): Promise<boolean> => {
    return invokeMainChannel(`${channel}-abort` as Channels, { streamId });
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

export async function compressImage(file: File): Promise<string | undefined> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        const base64URL = imageCompression.getDataUrlFromFile(compressedFile);
        console.log(`Image size reduced from ${file.size} to ${compressedFile.size} (bytes)`);
        return base64URL;
    } catch (error) {
        console.error('Error compressing image:', error);
    }
}
