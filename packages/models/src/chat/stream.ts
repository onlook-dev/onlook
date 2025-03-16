import type { CoreMessage, LanguageModelUsage, TextStreamPart, ToolSet } from 'ai';
import type { UsageCheckResult } from './response';

export interface StreamResponse {
    type: 'partial' | 'full' | 'error' | 'rate-limited';
}

export interface PartialStreamResponse extends StreamResponse {
    payload: TextStreamPart<ToolSet>;
    type: 'partial';
}

export interface FullStreamResponse extends StreamResponse {
    payload: CoreMessage[];
    type: 'full';
    usage?: LanguageModelUsage;
    text: string;
}

export interface ErrorStreamResponse extends StreamResponse {
    type: 'error';
    message: string;
}

export interface RateLimitedStreamResponse extends StreamResponse {
    type: 'rate-limited';
    rateLimitResult: UsageCheckResult;
}

export type CompletedStreamResponse =
    | FullStreamResponse
    | RateLimitedStreamResponse
    | ErrorStreamResponse;
