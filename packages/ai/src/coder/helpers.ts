import { marked } from 'marked';

/**
 * Extracts code from markdown code blocks. If no code blocks are found, returns the original text.
 * @param text The markdown text containing code blocks
 * @returns The extracted code or original text if no code blocks found
 */
export function extractCodeBlocks(text: string): string {
    let codeBlocks: string[] = [];

    // Create custom tokenizer to capture code blocks
    const tokenizer = new marked.Tokenizer();

    // Parse the markdown
    const tokens = marked.lexer(text);

    // Extract code from code blocks
    tokens.forEach((token) => {
        if (token.type === 'code') {
            codeBlocks.push(token.text);
        }
    });

    // If no code blocks found, return original text
    if (codeBlocks.length === 0) {
        return text;
    }

    // Join all code blocks with newlines
    return codeBlocks.join('\n\n');
}
