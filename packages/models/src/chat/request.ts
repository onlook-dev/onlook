import type { CoreMessage } from 'ai';

export enum StreamRequestType {
    CHAT = 'chat',
    CREATE = 'create',
    ERROR_FIX = 'error-fix',
}

export type StreamRequest = {
    messages: CoreMessage[];
    systemPrompt: string;
    requestType: StreamRequestType;
    useAnalytics: boolean;
};
