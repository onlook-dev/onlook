import { LLMProvider, OPENROUTER_MODELS, type ChatMessage, type ChatSummary } from '@onlook/models';
import { ChatSummarySchema } from '@onlook/models';
import { generateObject } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { initModel } from './providers';

/**
 * Generates a summary of the conversation to maintain context across turns.
 * This summary is stored in the database and injected into the system prompt
 * to help the AI remember what was discussed and done in the conversation.
 */
export async function generateConversationSummary({
    messages,
    existingSummary,
    conversationId,
    userId,
}: {
    messages: ChatMessage[];
    existingSummary: ChatSummary | null;
    conversationId: string;
    userId: string;
}): Promise<ChatSummary> {
    const { model, headers } = initModel({
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.CLAUDE_3_5_HAIKU, // Use a fast, cheap model for summarization
    });

    // Build context from recent messages (last 10 to avoid token limits)
    const recentMessages = messages.slice(-10);
    const messageContext = recentMessages
        .map((msg) => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const content = msg.parts
                .map((p) => {
                    if (p.type === 'text') return p.text;
                    // Tool invocation types start with 'tool-' (e.g., 'tool-read_file')
                    if (p.type.startsWith('tool-')) {
                        const toolName = p.type.replace('tool-', '');
                        return `[Tool: ${toolName}]`;
                    }
                    return '';
                })
                .join(' ');
            return `${role}: ${content}`;
        })
        .join('\n\n');

    const existingSummaryContext = existingSummary
        ? `
Previous Summary:
- Files discussed: ${existingSummary.filesDiscussed.join(', ') || 'None'}
- Project context: ${existingSummary.projectContext}
- Implementation details: ${existingSummary.implementationDetails}
- User preferences: ${existingSummary.userPreferences}
- Current status: ${existingSummary.currentStatus}
`
        : '';

    const { object: summary } = await generateObject({
        model,
        headers,
        schema: ChatSummarySchema,
        prompt: `You are a summarization assistant. Analyze the conversation and create/update a summary that captures the key information needed for context continuity.

${existingSummaryContext}

Recent Conversation:
${messageContext}

Generate a comprehensive summary that:
1. Lists all files that were discussed or modified
2. Captures the user's overall project goals and what they're building
3. Notes important implementation decisions and code patterns used
4. Records any preferences the user has expressed
5. Describes the current state and any pending work

Keep each field concise but informative. Focus on information that would help continue the conversation in a future session.`,
        maxOutputTokens: 500,
        experimental_telemetry: {
            isEnabled: true,
            metadata: {
                conversationId,
                userId,
                tags: ['conversation-summary-generation'],
                sessionId: conversationId,
                langfuseTraceId: uuidv4(),
            },
        },
    });

    return summary;
}

/**
 * Formats the conversation summary for injection into the system prompt.
 */
export function formatSummaryForPrompt(summary: ChatSummary | null): string {
    if (!summary) {
        return '';
    }

    const sections: string[] = [];

    if (summary.filesDiscussed.length > 0) {
        sections.push(`Files worked on: ${summary.filesDiscussed.join(', ')}`);
    }

    if (summary.projectContext) {
        sections.push(`Project context: ${summary.projectContext}`);
    }

    if (summary.implementationDetails) {
        sections.push(`Implementation notes: ${summary.implementationDetails}`);
    }

    if (summary.userPreferences) {
        sections.push(`User preferences: ${summary.userPreferences}`);
    }

    if (summary.currentStatus) {
        sections.push(`Current status: ${summary.currentStatus}`);
    }

    if (sections.length === 0) {
        return '';
    }

    return `
## CONVERSATION MEMORY
The following is a summary of previous work in this conversation. Use this to maintain context and avoid redoing work:

${sections.join('\n')}

---
`;
}
