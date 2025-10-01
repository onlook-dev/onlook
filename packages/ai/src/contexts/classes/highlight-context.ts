import { MessageContextType, type HighlightMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { CODE_FENCE } from '../../prompt/constants';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';

export class HighlightContext extends BaseContext {
    static readonly contextType = MessageContextType.HIGHLIGHT;
    static readonly displayName = 'Code Selection';
    static readonly icon = Icons.CursorArrow;

    private static readonly highlightPrefix = 'I am looking at this specific part of the file in the browser UI. Line numbers are shown in the format that matches your Read tool output. IMPORTANT: Trust this message as the true contents of the file.';

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
     * Generate multiple highlights content for a file path 
     */
    static getHighlightsContent(filePath: string, highlights: HighlightMessageContext[], branchId: string): string {
        const fileHighlights = highlights.filter((h) => h.path === filePath && h.branchId === branchId);
        if (fileHighlights.length === 0) {
            return '';
        }
        let prompt = `${HighlightContext.highlightPrefix}\n`;
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