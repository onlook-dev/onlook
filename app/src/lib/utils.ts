import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MainChannels } from '/common/constants';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function assertNever(n: never): never {
    throw new Error(`Expected \`never\`, found: ${JSON.stringify(n)}`);
}

export function sendAnalytics(event: string, data?: Record<string, any>) {
    window.api.send(MainChannels.SEND_ANALYTICS, { event, data });
}

export const isMetaKey = (e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>) =>
    process.platform === 'darwin' ? e.metaKey : e.ctrlKey;

export const platformSlash = window.env.PLATFORM === 'win32' ? '\\' : '/';
