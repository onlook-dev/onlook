import type { ModelMessage } from 'ai';

export enum StreamRequestType {
    CHAT = 'chat',
    CREATE = 'create',
    ERROR_FIX = 'error-fix',
    SUGGESTIONS = 'suggestions',
    SUMMARY = 'summary',
}

export type StreamRequest = {
    messages: ModelMessage[];
    systemPrompt: string;
    requestType: StreamRequestType;
    useAnalytics: boolean;
};

export type StreamRequestV2 = {
    messages: ModelMessage[];
    requestType: StreamRequestType;
    useAnalytics: boolean;
};
