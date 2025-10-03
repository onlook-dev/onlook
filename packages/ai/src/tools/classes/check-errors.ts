import type { CheckErrorsResult } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import type { ParsedError } from '@onlook/utility';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class CheckErrorsTool extends ClientTool {
    static readonly toolName = 'check_errors';
    static readonly description = 'Check for terminal errors similar to chat errors. Lists all current terminal errors from all branches.'
    static readonly parameters = z.object({});
    static readonly icon = Icons.MagnifyingGlass;

    async handle(
        _params: unknown,
        editorEngine: EditorEngine,
    ): Promise<CheckErrorsResult> {
        const errors = editorEngine.branches.getAllErrors();

        if (errors.length === 0) {
            return {
                success: true,
                message: 'No errors found.',
                errors: [],
                count: 0,
            };
        }

        const errorSummary = errors.map((error: ParsedError) => ({
            sourceId: error.sourceId,
            type: error.type,
            content: error.content,
            branchId: error.branchId,
            branchName: error.branchName,
        }));

        return {
            success: true,
            message: `Found ${errors.length} error${errors.length > 1 ? 's' : ''}`,
            errors: errorSummary,
            count: errors.length,
        };
    }

    static getLabel(input?: z.infer<typeof CheckErrorsTool.parameters>): string {
        return 'Checking for errors';
    }
}