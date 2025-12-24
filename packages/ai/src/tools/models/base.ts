import { tool } from 'ai';
import type { ComponentType } from 'react';
import { type z } from 'zod';

export interface ToolIcon {
    className?: string;
}

export abstract class BaseTool {
    static readonly toolName: string;
    static readonly description: string;
    static readonly parameters: z.ZodSchema;
    static readonly icon: ComponentType<ToolIcon>;

    /**
     * Get the AI SDK tool definition
     */
    static getAITool() {
        return tool({
            description: this.description,
            inputSchema: this.parameters,
        });
    }

    /**
     * Generate a dynamic label for the tool call based on input parameters
     */
    static getLabel(input?: unknown): string {
        return this.toolName;
    }
}