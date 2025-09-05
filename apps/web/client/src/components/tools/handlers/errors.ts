import type { EditorEngine } from '@/components/store/editor/engine';
import type { CheckErrorsResult } from '@onlook/models';
import type { ParsedError } from '@onlook/utility';

export async function handleCheckErrors(
    params: unknown,
    editorEngine: EditorEngine,
): Promise<CheckErrorsResult> {
    const errors = editorEngine.branches.getAllErrors();

    if (errors.length === 0) {
        return {
            success: true,
            message: 'No terminal errors found.',
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
        message: `Found ${errors.length} terminal error${errors.length > 1 ? 's' : ''}`,
        errors: errorSummary,
        count: errors.length,
    };
}