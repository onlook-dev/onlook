import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class OnlookInstructionsTool extends ClientTool {
    static readonly name = 'onlook_instructions';
    static readonly description = 'Get Onlook-specific instructions and guidelines';
    static readonly parameters = z.object({});
    static readonly icon = Icons.OnlookLogo;

    constructor(
        private handleImpl?: (input: z.infer<typeof OnlookInstructionsTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof OnlookInstructionsTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('OnlookInstructionsTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof OnlookInstructionsTool.parameters>): string {
        return 'Reading Onlook instructions';
    }
}