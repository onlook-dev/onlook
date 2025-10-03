import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class ReadStyleGuideTool extends ClientTool {
    static readonly toolName = 'read_style_guide';
    static readonly description = 'Read the project style guide and coding conventions';
    static readonly parameters = z.object({});
    static readonly icon = Icons.Brand;

    async handle(_params: unknown, editorEngine: EditorEngine): Promise<{
        configPath: string;
        cssPath: string;
        configContent: string;
        cssContent: string;
    }> {
        const result = await editorEngine.theme.initializeTailwindColorContent();
        if (!result) {
            throw new Error('Style guide files not found');
        }
        return result;
    }

    static getLabel(input?: z.infer<typeof ReadStyleGuideTool.parameters>): string {
        return 'Reading style guide';
    }
}