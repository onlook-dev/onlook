import type { CoreMessage } from 'ai';

export enum StreamRequestType {
    CHAT = 'chat',
    CREATE = 'create',
    ERROR_FIX = 'error-fix',
    SUGGESTIONS = 'suggestions',
    SUMMARY = 'summary',
}

export type StreamRequest = {
    messages: CoreMessage[];
    systemPrompt: string;
    requestType: StreamRequestType;
    useAnalytics: boolean;
};

export type StreamRequestV2 = {
    messages: CoreMessage[];
    requestType: StreamRequestType;
    useAnalytics: boolean;
};
