import { MessageContextType, type AgentRuleMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { wrapXml } from '../../prompt/helpers';
import type { BaseContext } from '../models/base';

export class AgentRuleContext implements BaseContext {
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
     * Generate multiple agent rules content (used by existing provider functions)
     */
    static getAgentRulesContent(agentRules: AgentRuleMessageContext[]): string {
        let content = `${AgentRuleContext.agentRulesContextPrefix}\n`;
        for (const agentRule of agentRules) {
            content += AgentRuleContext.getPrompt(agentRule);
        }
        return wrapXml('agent-rules', content);
    }
}