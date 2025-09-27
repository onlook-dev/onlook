import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { BaseTool } from './base';
import type { AbstractChat, ChatOnToolCallCallback } from 'ai';
import type { AgentType, ChatMessage } from '@onlook/models';

export type OnToolCallHandler = (subAgentType: AgentType, addToolResult: typeof AbstractChat.prototype.addToolResult) => ChatOnToolCallCallback<ChatMessage>;


export abstract class ClientTool<TInput = any, TOutput = any> extends BaseTool {
    /**
     * Handle the tool execution on the client side
     */
    abstract handle(input: TInput, editorEngine: EditorEngine, getOnToolCall: OnToolCallHandler): Promise<TOutput>;
}