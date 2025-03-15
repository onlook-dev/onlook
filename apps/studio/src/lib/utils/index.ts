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
    callbacks: {
        onPartial?: (data: P) => void;
        onComplete?: (data: P) => void;
        onError?: (error: string) => void;
    }
): Promise<{ streamId: string }> => {
    const streamId = nanoid();
    const streamChannel = `${channel}-stream-${streamId}` as Channels;
    const completeChannel = `${streamChannel}-complete` as Channels;
    const errorChannel = `${streamChannel}-error` as Channels;
    
    // Set up listeners for stream events
    const partialListener = (data: P) => {
        if (callbacks.onPartial) callbacks.onPartial(data);
    };
    
    const completeListener = (data: P) => {
        if (callbacks.onComplete) callbacks.onComplete(data);
        // Clean up listeners
        window.api.removeListener(streamChannel, partialListener);
        window.api.removeListener(completeChannel, completeListener);
        window.api.removeListener(errorChannel, errorListener);
    };
    
    const errorListener = (error: string) => {
        if (callbacks.onError) callbacks.onError(error);
        // Clean up listeners
        window.api.removeListener(streamChannel, partialListener);
        window.api.removeListener(completeChannel, completeListener);
        window.api.removeListener(errorChannel, errorListener);
    };
    
    // Register listeners
    window.api.on(streamChannel, partialListener);
    window.api.on(completeChannel, completeListener);
    window.api.on(errorChannel, errorListener);
    
    // Invoke the channel with the streamId
    return invokeMainChannel(channel, { ...args, streamId });
};

export const abortStream = (channel: Channels, streamId: string): Promise<boolean> => {
    const abortChannel = `${channel}-abort` as Channels;
    return invokeMainChannel(abortChannel, { streamId });
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
