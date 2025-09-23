import { BaseTool } from './base';

// Generic type for editor engine - will be properly typed at integration layer
export type EditorEngine = any;

export abstract class ClientTool extends BaseTool {
    /**
     * Handle the tool execution on the client side
     */
    abstract handle(input: any, editorEngine: EditorEngine): Promise<any>;
}