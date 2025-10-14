import { MessageContextType, type AgentRuleMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { wrapXml } from '../../prompt/helpers';
import { BaseContext } from '../models/base';

export class AgentRuleContext extends BaseContext {
    static readonly contextType = MessageContextType.AGENT_RULE;
    static readonly displayName = 'Agent Rule';
    static readonly icon = Icons.Cube;

    private static readonly agentRulesContextPrefix = `These are user provided rules for the project`;

    static getPrompt(context: AgentRuleMessageContext): string {
        return `${context.path}\n${context.content}`;
    }

    static getLabel(context: AgentRuleMessageContext): string {
        return context.displayName || context.path;
    }

    /**
     * Generate multiple agent rules content 
     */
    static getAgentRulesContent(agentRules: AgentRuleMessageContext[]): string {
        let content = `${AgentRuleContext.agentRulesContextPrefix}\n`;
        const rulePrompts = agentRules.map(agentRule => AgentRuleContext.getPrompt(agentRule));
        content += rulePrompts.join('\n');
        return wrapXml('agent-rules', content);
    }
}