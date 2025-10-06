import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { getFileSystem } from '../shared/helpers/files';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class FuzzyEditFileTool extends ClientTool {
    static readonly toolName = 'fuzzy_edit_file';
    static readonly description = 'Edit a file using fuzzy matching and natural language instructions';
    static readonly parameters = z.object({
        file_path: z.string().describe('The absolute path to the file to edit'),
        content: z.string()
            .describe(`The edit to the file. You only need to include the parts of the code that are being edited instead of the entire file. A smaller model will handle implementing the rest of the code. You must leave comments to indicate the parts of the code that are not being edited such as:
// ... existing code
const foo = 'bar';
// ... existing code
Make sure there's enough context for the other model to understand where the changes are being made.`),
        instruction: z
            .string()
            .describe(
                'A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist another model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit.',
            ),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Pencil;

    async handle(
        args: z.infer<typeof FuzzyEditFileTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<string> {

        const fileSystem = await getFileSystem(args.branchId, editorEngine);
        const originalFile = await fileSystem.readFile(args.file_path);

        if (typeof originalFile !== 'string') {
            throw new Error('Binary files are not supported for editing');
        }

        const metadata = {
            projectId: editorEngine.projectId,
            conversationId: editorEngine.chat.conversation.current?.id,
        };

        const updatedContent = await editorEngine.api.applyDiff({
            originalCode: originalFile,
            updateSnippet: args.content,
            instruction: args.instruction,
            metadata,
        });
        if (!updatedContent.result) {
            throw new Error('Error applying code change: ' + updatedContent.error);
        }

        await fileSystem.writeFile(args.file_path, updatedContent.result);
        return 'File edited!';
    }

    static getLabel(input?: z.infer<typeof FuzzyEditFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing file';
    }
}