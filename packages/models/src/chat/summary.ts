import { z } from 'zod';

export const ChatSummarySchema = z.object({
    filesDiscussed: z
        .array(z.string())
        .describe('List of file paths mentioned in the conversation'),
    projectContext: z
        .string()
        .describe('Summary of what the user is building and their overall goals'),
    implementationDetails: z
        .string()
        .describe('Summary of key code decisions, patterns, and important implementation details'),
    userPreferences: z
        .string()
        .describe('Specific preferences the user has expressed about implementation, design, etc.'),
    currentStatus: z.string().describe('Current state of the project and any pending work'),
});
