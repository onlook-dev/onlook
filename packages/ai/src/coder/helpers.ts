/**
 * Extracts code blocks from a string.
 * Code blocks are expected to be wrapped in triple backticks (```).
 *
 * @param text The string containing code blocks
 * @returns An array of extracted code blocks with their language (if specified)
 */
export function extractCodeBlocks(text: string): Array<{ code: string; language?: string }> {
    // Regular expression to match code blocks
    // Captures optional language identifier after opening backticks
    const codeBlockRegex = /```(?:([\w-]+)?\n)?([\s\S]*?)```/g;

    const codeBlocks: Array<{ code: string; language?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1]?.trim() || undefined;
        const code = match[2].trim();

        codeBlocks.push({ code, language });
    }

    return codeBlocks;
}
