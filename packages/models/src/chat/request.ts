import type { CoreMessage } from 'ai';

export enum StreamRequestType {
    CHAT = 'chat',
    CREATE = 'create',
    ERROR_FIX = 'error-fix',
}

export type StreamRequest = {
    messages: CoreMessage[];
    userId: string | null;
    systemPrompt: string;
    requestType: StreamRequestType;
    useAnalytics: boolean;
};
