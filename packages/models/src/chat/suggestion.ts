import { z } from 'zod';

export interface ProjectSuggestions {
    id: string;
    projectId: string;
    suggestions: ChatSuggestion[];
}

export interface ChatSuggestion {
    title: string;
    prompt: string;
}

export const ChatSuggestionSchema = z.object({
    title: z
        .string()
        .describe(
            'The display title of the suggestion. This will be shown to the user. Keep it concise but descriptive.',
        ),
    prompt: z
        .string()
        .describe(
            'The prompt for the suggestion. This will be used to generate the suggestion. Make this as detailed and specific as possible.',
        ),
});
