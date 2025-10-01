import { MessageContextType, type ErrorMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { CONTEXT_PROMPTS } from '../../prompt/constants';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';

export class ErrorContext implements BaseContext {
    static readonly contextType = MessageContextType.ERROR;
    static readonly displayName = 'Error';
    static readonly icon = Icons.InfoCircled;

    static getPrompt(context: ErrorMessageContext): string {
        const branchDisplay = ErrorContext.getBranchContent(context.branchId);
        const errorDisplay = wrapXml('error', context.content);
        return `${branchDisplay}\n${errorDisplay}\n`;
    }

    static getLabel(context: ErrorMessageContext): string {
        return context.displayName || 'Error';
    }

    /**
     * Generate multiple errors content (used by existing provider functions)
     */
    static getErrorsContent(errors: ErrorMessageContext[]): string {
        if (errors.length === 0) {
            return '';
        }
        let prompt = `${CONTEXT_PROMPTS.errorsContentPrefix}\n`;
        for (const error of errors) {
            prompt += ErrorContext.getPrompt(error);
        }

        prompt = wrapXml('errors', prompt);
        return prompt;
    }

    private static getBranchContent(id: string): string {
        return wrapXml('branch', `id: "${id}"`);
    }
}