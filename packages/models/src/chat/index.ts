import type { Branch } from '../branching';
import { z } from 'zod';

// Message Context Types
export enum MessageContextType {
    FILE = 'file',
    HIGHLIGHT = 'highlight',
    IMAGE = 'image',
    ERROR = 'error',
    BRANCH = 'branch',
    AGENT_RULE = 'agent_rule',
}

type BaseMessageContext = {
    type: MessageContextType;
    content: string;
    displayName: string;
};

export type FileMessageContext = BaseMessageContext & {
    type: MessageContextType.FILE;
    path: string;
    branchId: string;
};

export type HighlightMessageContext = BaseMessageContext & {
    type: MessageContextType.HIGHLIGHT;
    path: string;
    start: number;
    end: number;
    oid?: string;
    branchId: string;
};

export type ImageMessageContext = BaseMessageContext & {
    type: MessageContextType.IMAGE;
    mimeType: string;
    id?: string;
    source: 'external' | 'local';
    path?: string;
    branchId?: string;
};

export type ErrorMessageContext = BaseMessageContext & {
    type: MessageContextType.ERROR;
    branchId: string;
};

export type BranchMessageContext = BaseMessageContext & {
    type: MessageContextType.BRANCH;
    branch: Branch;
};

export type AgentRuleMessageContext = BaseMessageContext & {
    type: MessageContextType.AGENT_RULE;
    path: string;
};

export type MessageContext =
    | FileMessageContext
    | HighlightMessageContext
    | ImageMessageContext
    | ErrorMessageContext
    | BranchMessageContext
    | AgentRuleMessageContext;

// Message Checkpoint Types
export enum MessageCheckpointType {
    GIT = 'git',
}

interface BaseMessageCheckpoint {
    type: MessageCheckpointType;
    createdAt: Date;
}

export interface GitMessageCheckpoint extends BaseMessageCheckpoint {
    type: MessageCheckpointType.GIT;
    oid: string;
    branchId?: string;
}

export type MessageCheckpoints = GitMessageCheckpoint;

// Agent Types
export enum AgentType {
    ROOT = "root",
    USER = "user",
}

// Chat Suggestion
export interface ChatSuggestion {
    title: string;
    prompt: string;
}

export const ChatSuggestionsSchema = z.object({
    suggestions: z.array(z.object({
        title: z.string(),
        prompt: z.string(),
    })),
});

// Message parts type (generic - actual structure defined by AI SDK)
export type MessagePart = any;
