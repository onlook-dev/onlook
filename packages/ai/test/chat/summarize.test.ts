import type { ChatMessage, ChatSummary } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import {
    buildMessageContext,
    extractMessageContent,
    formatExistingSummaryContext,
    formatSummaryForPrompt,
    getRoleLabel,
    SUMMARY_MESSAGE_LIMIT,
} from '../../src/chat/summarize';

function createMessage(
    parts: ChatMessage['parts'],
    role: 'user' | 'assistant' | 'system' = 'user'
): ChatMessage {
    return {
        id: 'test-id',
        createdAt: new Date(),
        role,
        threadId: 'test-thread',
        parts,
        metadata: { context: [], checkpoints: [] },
    } as unknown as ChatMessage;
}

function createSummary(overrides: Partial<ChatSummary> = {}): ChatSummary {
    return {
        filesDiscussed: [],
        projectContext: '',
        implementationDetails: '',
        userPreferences: '',
        currentStatus: '',
        ...overrides,
    };
}

describe('SUMMARY_MESSAGE_LIMIT', () => {
    test('is set to 10', () => {
        expect(SUMMARY_MESSAGE_LIMIT).toBe(10);
    });
});

describe('extractMessageContent', () => {
    test('extracts text from text parts', () => {
        const parts = [{ type: 'text', text: 'hello world' }] as ChatMessage['parts'];
        expect(extractMessageContent(parts)).toBe('hello world');
    });

    test('extracts multiple text parts joined by space', () => {
        const parts = [
            { type: 'text', text: 'hello' },
            { type: 'text', text: 'world' },
        ] as ChatMessage['parts'];
        expect(extractMessageContent(parts)).toBe('hello world');
    });

    test('formats tool invocations with tool name', () => {
        // Create a minimal tool part - use unknown first to avoid strict type checking
        const parts = [{ type: 'tool-read_file', toolCallId: 'test', state: 'output', input: { path: '/test' }, output: {} }] as unknown as ChatMessage['parts'];
        expect(extractMessageContent(parts)).toBe('[Tool: read_file]');
    });

    test('handles mixed text and tool parts', () => {
        const parts = [
            { type: 'text', text: 'Reading file:' },
            { type: 'tool-read_file', toolCallId: 'test', state: 'output', input: { path: '/test' }, output: {} },
        ] as unknown as ChatMessage['parts'];
        expect(extractMessageContent(parts)).toBe('Reading file: [Tool: read_file]');
    });

    test('ignores unknown part types', () => {
        const parts = [
            { type: 'text', text: 'visible' },
            { type: 'unknown', data: 'ignored' },
        ] as unknown as ChatMessage['parts'];
        expect(extractMessageContent(parts)).toBe('visible ');
    });

    test('handles empty parts array', () => {
        expect(extractMessageContent([])).toBe('');
    });

    test('handles undefined parts', () => {
        expect(extractMessageContent(undefined)).toBe('');
    });

    test('handles null parts', () => {
        expect(extractMessageContent(null)).toBe('');
    });
});

describe('getRoleLabel', () => {
    test('returns User for user role', () => {
        expect(getRoleLabel('user')).toBe('User');
    });

    test('returns System for system role', () => {
        expect(getRoleLabel('system')).toBe('System');
    });

    test('returns Assistant for assistant role', () => {
        expect(getRoleLabel('assistant')).toBe('Assistant');
    });
});

describe('buildMessageContext', () => {
    test('builds context from single message', () => {
        const messages = [createMessage([{ type: 'text', text: 'hello' }], 'user')];
        expect(buildMessageContext(messages)).toBe('User: hello');
    });

    test('builds context from multiple messages', () => {
        const messages = [
            createMessage([{ type: 'text', text: 'hello' }], 'user'),
            createMessage([{ type: 'text', text: 'hi there' }], 'assistant'),
        ];
        expect(buildMessageContext(messages)).toBe('User: hello\n\nAssistant: hi there');
    });

    test('includes system messages with correct label', () => {
        const messages = [
            createMessage([{ type: 'text', text: 'system instructions' }], 'system'),
            createMessage([{ type: 'text', text: 'user input' }], 'user'),
        ];
        expect(buildMessageContext(messages)).toBe('System: system instructions\n\nUser: user input');
    });

    test('limits messages to SUMMARY_MESSAGE_LIMIT', () => {
        const messages = Array.from({ length: 15 }, (_, i) =>
            createMessage([{ type: 'text', text: `message ${i}` }], 'user')
        );
        const context = buildMessageContext(messages);
        // Should only include last 10 messages (5-14)
        expect(context).toContain('message 5');
        expect(context).toContain('message 14');
        expect(context).not.toContain('message 4');
    });

    test('accepts custom limit', () => {
        const messages = Array.from({ length: 10 }, (_, i) =>
            createMessage([{ type: 'text', text: `message ${i}` }], 'user')
        );
        const context = buildMessageContext(messages, 3);
        // Should only include last 3 messages (7-9)
        expect(context).toContain('message 7');
        expect(context).toContain('message 9');
        expect(context).not.toContain('message 6');
    });

    test('handles empty messages array', () => {
        expect(buildMessageContext([])).toBe('');
    });

    test('handles messages with only tool invocations', () => {
        const messages = [
            createMessage([{ type: 'tool-read_file', input: {} }] as unknown as ChatMessage['parts'], 'assistant'),
        ];
        expect(buildMessageContext(messages)).toBe('Assistant: [Tool: read_file]');
    });
});

describe('formatExistingSummaryContext', () => {
    test('returns empty string for null summary', () => {
        expect(formatExistingSummaryContext(null)).toBe('');
    });

    test('formats summary with all fields', () => {
        const summary = createSummary({
            filesDiscussed: ['src/index.ts', 'src/utils.ts'],
            projectContext: 'Building a CLI tool',
            implementationDetails: 'Using TypeScript with strict mode',
            userPreferences: 'Prefer functional style',
            currentStatus: 'Working on parsing logic',
        });
        const result = formatExistingSummaryContext(summary);
        expect(result).toContain('Files discussed: src/index.ts, src/utils.ts');
        expect(result).toContain('Project context: Building a CLI tool');
        expect(result).toContain('Implementation details: Using TypeScript with strict mode');
        expect(result).toContain('User preferences: Prefer functional style');
        expect(result).toContain('Current status: Working on parsing logic');
    });

    test('shows None for empty filesDiscussed', () => {
        const summary = createSummary({ filesDiscussed: [] });
        const result = formatExistingSummaryContext(summary);
        expect(result).toContain('Files discussed: None');
    });
});

describe('formatSummaryForPrompt', () => {
    test('returns empty string for null summary', () => {
        expect(formatSummaryForPrompt(null)).toBe('');
    });

    test('returns empty string for summary with all empty fields', () => {
        const summary = createSummary();
        expect(formatSummaryForPrompt(summary)).toBe('');
    });

    test('includes CONVERSATION MEMORY header', () => {
        const summary = createSummary({ projectContext: 'Test project' });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('## CONVERSATION MEMORY');
    });

    test('includes files worked on section', () => {
        const summary = createSummary({
            filesDiscussed: ['src/index.ts', 'src/utils.ts'],
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('Files worked on: src/index.ts, src/utils.ts');
    });

    test('includes project context section', () => {
        const summary = createSummary({
            projectContext: 'Building a CLI tool',
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('Project context: Building a CLI tool');
    });

    test('includes implementation notes section', () => {
        const summary = createSummary({
            implementationDetails: 'Using TypeScript',
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('Implementation notes: Using TypeScript');
    });

    test('includes user preferences section', () => {
        const summary = createSummary({
            userPreferences: 'Prefer functional style',
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('User preferences: Prefer functional style');
    });

    test('includes current status section', () => {
        const summary = createSummary({
            currentStatus: 'Working on feature X',
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('Current status: Working on feature X');
    });

    test('only includes non-empty sections', () => {
        const summary = createSummary({
            projectContext: 'Test project',
            currentStatus: 'In progress',
            // other fields empty
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('Project context: Test project');
        expect(result).toContain('Current status: In progress');
        expect(result).not.toContain('Files worked on:');
        expect(result).not.toContain('Implementation notes:');
        expect(result).not.toContain('User preferences:');
    });

    test('formats all sections correctly', () => {
        const summary = createSummary({
            filesDiscussed: ['file1.ts'],
            projectContext: 'Project',
            implementationDetails: 'Details',
            userPreferences: 'Prefs',
            currentStatus: 'Status',
        });
        const result = formatSummaryForPrompt(summary);
        expect(result).toContain('## CONVERSATION MEMORY');
        expect(result).toContain('---');
        expect(result).toContain('Files worked on: file1.ts');
        expect(result).toContain('Project context: Project');
        expect(result).toContain('Implementation notes: Details');
        expect(result).toContain('User preferences: Prefs');
        expect(result).toContain('Current status: Status');
    });
});
