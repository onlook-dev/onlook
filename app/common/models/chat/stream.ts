import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock } from '@anthropic-ai/sdk/resources';

export interface StreamResponse {
    id: string;
    type: 'stream-response';
    status: 'start' | 'in-progress' | 'complete' | 'error';
    content?: ContentBlock[];
    error?: string;
    finalMessage?: Anthropic.Messages.Message;
}
