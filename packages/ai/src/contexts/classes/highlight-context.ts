import { Icons } from '@onlook/ui/icons';
import { MessageContextType, type HighlightMessageContext } from '@onlook/models';
import { BaseContext } from '../models/base';
import { wrapXml } from '../../prompt/helpers';
import { CODE_FENCE, CONTEXT_PROMPTS } from '../../prompt/constants';

export class HighlightContext implements BaseContext {
    static readonly contextType = MessageContextType.HIGHLIGHT;
    static readonly displayName = 'Code Selection';
    static readonly icon = Icons.Target;
    
    static getPrompt(context: HighlightMessageContext): string {
        const branchDisplay = HighlightContext.getBranchContent(context.branchId);
        const pathDisplay = wrapXml('path', `${context.path}#L${context.start}:L${context.end}`);
        let prompt = `${pathDisplay}\n${branchDisplay}\n`;
        prompt += `${CODE_FENCE.start}\n`;
        prompt += context.content;
        prompt += `\n${CODE_FENCE.end}\n`;
        return prompt;
    }
    
    static getLabel(context: HighlightMessageContext): string {
        return context.displayName || context.path.split('/').pop() || 'Code Selection';
    }
    
    /**
     * Generate multiple highlights content for a file path (used by existing provider functions)
     */
    static getHighlightsContent(filePath: string, highlights: HighlightMessageContext[]): string {
        const fileHighlights = highlights.filter((h) => h.path === filePath);
        if (fileHighlights.length === 0) {
            return '';
        }
        let prompt = `${CONTEXT_PROMPTS.highlightPrefix}\n`;
        let index = 1;
        for (const highlight of fileHighlights) {
            let highlightPrompt = HighlightContext.getPrompt(highlight);
            highlightPrompt = wrapXml(
                fileHighlights.length > 1 ? `highlight-${index}` : 'highlight',
                highlightPrompt,
            );
            prompt += highlightPrompt;
            index++;
        }
        return prompt;
    }
    
    private static getBranchContent(id: string): string {
        return wrapXml('branch', `id: "${id}"`);
    }
}