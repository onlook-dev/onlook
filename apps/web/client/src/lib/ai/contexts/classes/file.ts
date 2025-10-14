import { MessageContextType, type FileMessageContext, type HighlightMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { CODE_FENCE } from '../../prompt/constants';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';
import { HighlightContext } from './highlight';

export class FileContext extends BaseContext {
    static readonly contextType = MessageContextType.FILE;
    static readonly displayName = 'File';
    static readonly icon = Icons.File;

    private static readonly filesContentPrefix = `I have added these files to the chat so you can go ahead and edit them`;
    private static readonly truncatedFilesContentPrefix = `This context originally included the content of files listed below and has been truncated to save space.
If relevant, feel free to retrieve their content.`;

    static getPrompt(context: FileMessageContext): string {
        const pathDisplay = wrapXml('path', context.path);
        const branchDisplay = wrapXml('branch', `id: "${context.branchId}"`);
        let prompt = `${pathDisplay}\n${branchDisplay}\n`;
        prompt += `${CODE_FENCE.start}${FileContext.getLanguageFromFilePath(context.path)}\n`;
        prompt += context.content;
        prompt += `\n${CODE_FENCE.end}\n`;
        return prompt;
    }

    static getLabel(context: FileMessageContext): string {
        return context.path.split('/').pop() || 'File';
    }

    /**
     * Generate multiple files content with highlights 
     */
    static getFilesContent(files: FileMessageContext[], highlights: HighlightMessageContext[]): string {
        if (files.length === 0) {
            return '';
        }
        let prompt = '';
        prompt += `${FileContext.filesContentPrefix}\n`;
        let index = 1;
        for (const file of files) {
            let filePrompt = FileContext.getPrompt(file);
            // Add highlights for this file
            const highlightContent = FileContext.getHighlightsForFile(file.path, highlights, file.branchId);
            if (highlightContent) {
                filePrompt += highlightContent;
            }

            filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
            prompt += filePrompt;
            index++;
        }

        return prompt;
    }

    /**
     * Generate truncated files content 
     */
    static getTruncatedFilesContent(files: FileMessageContext[]): string {
        if (files.length === 0) {
            return '';
        }
        let prompt = '';
        prompt += `${FileContext.truncatedFilesContentPrefix}\n`;
        let index = 1;
        for (const file of files) {
            const branchDisplay = FileContext.getBranchContent(file.branchId);
            const pathDisplay = wrapXml('path', file.path);
            let filePrompt = `${pathDisplay}\n${branchDisplay}\n`;
            filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
            prompt += filePrompt;
            index++;
        }

        return prompt;
    }

    private static getBranchContent(id: string): string {
        return wrapXml('branch', `id: "${id}"`);
    }

    private static getHighlightsForFile(filePath: string, highlights: HighlightMessageContext[], branchId: string): string {
        // Import HighlightContext dynamically to avoid circular imports
        return HighlightContext.getHighlightsContent(filePath, highlights, branchId);
    }

    private static getLanguageFromFilePath(filePath: string): string {
        return filePath.split('.').pop() ?? '';
    }
}