import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class ReadStyleGuideTool extends ClientTool {
    static readonly name = 'read_style_guide';
    static readonly description = 'Read the project style guide and coding conventions';
    static readonly parameters = z.object({});
    static readonly icon = Icons.Brand;

    constructor(
        private handleImpl?: (input: z.infer<typeof ReadStyleGuideTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof ReadStyleGuideTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('ReadStyleGuideTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof ReadStyleGuideTool.parameters>): string {
        return 'Reading style guide';
    }
}