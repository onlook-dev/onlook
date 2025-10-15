import { MessageContextType, type BranchMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';

export class BranchContext extends BaseContext {
    static readonly contextType = MessageContextType.BRANCH;
    static readonly displayName = 'Branch';
    static readonly icon = Icons.Branch;

    static getPrompt(context: BranchMessageContext): string {
        return `Branch: ${context.branch.name} (${context.branch.id})\nDescription: ${context.content}`;
    }

    static getLabel(context: BranchMessageContext): string {
        return context.displayName || context.branch.name;
    }

    /**
     * Generate multiple branches content 
     */
    static getBranchesContent(branches: BranchMessageContext[]): string {
        let prompt = `I'm working on the following branches: \n`;
        prompt += branches.map((b) => b.branch.id).join(', ');
        prompt = wrapXml('branches', prompt);
        return prompt;
    }
}