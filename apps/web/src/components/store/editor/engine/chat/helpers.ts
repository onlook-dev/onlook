export const PROMPT_TOO_LONG_ERROR = `Our conversation memory is full. Please start a new chat to continue.`;

export function isPromptTooLongError(content: string) {
    return (
        content.includes('invalid_request_error') &&
        (content.includes('prompt is too long') || content.includes('exceed context limit'))
    );
}
