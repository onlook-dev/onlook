import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { ONLOOK_INSTRUCTIONS } from 'src/prompt/onlook';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class OnlookInstructionsTool implements ClientTool {
    static readonly name = 'onlook_instructions';
    static readonly description = 'Get Onlook-specific instructions and guidelines';
    static readonly parameters = z.object({});
    static readonly icon = Icons.OnlookLogo;

    async handle(input: z.infer<typeof OnlookInstructionsTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        return ONLOOK_INSTRUCTIONS;
    }

    getLabel(input?: z.infer<typeof OnlookInstructionsTool.parameters>): string {
        return 'Reading Onlook instructions';
    }
}