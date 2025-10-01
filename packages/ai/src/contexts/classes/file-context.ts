import { MessageContextType, type FileMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { CODE_FENCE } from '../../prompt/constants';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';

export class FileContext implements BaseContext {
    static readonly contextType = MessageContextType.FILE;
    static readonly displayName = 'File';
    static readonly icon = Icons.File;

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

    private static getLanguageFromFilePath(filePath: string): string {
        return filePath.split('.').pop() ?? '';
    }
}