import { Icons } from '@onlook/ui/icons';
import { MessageContextType, type AgentRuleMessageContext } from '@onlook/models';
import { BaseContext } from '../models/base';
import { wrapXml } from '../../prompt/helpers';
import { CONTEXT_PROMPTS } from '../../prompt/constants';

export class AgentRuleContext extends BaseContext {
    static readonly contextType = MessageContextType.AGENT_RULE;
    static readonly displayName = 'Agent Rule';
    static readonly icon = Icons.FileCode;
    
    static getPrompt(context: AgentRuleMessageContext): string {
        return `${context.path}\n${context.content}`;
    }
    
    static getLabel(context: AgentRuleMessageContext): string {
        return context.displayName || context.path;
    }
    
    /**
     * Generate multiple agent rules content (used by existing provider functions)
     */
    static getAgentRulesContent(agentRules: AgentRuleMessageContext[]): string {
        let content = `${CONTEXT_PROMPTS.agentRulesContextPrefix}\n`;
        for (const agentRule of agentRules) {
            content += AgentRuleContext.getPrompt(agentRule);
        }
        return wrapXml('agent-rules', content);
    }
}