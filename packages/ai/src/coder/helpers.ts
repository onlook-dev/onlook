import { marked } from 'marked';

/**
 * Extracts code from markdown code blocks. If no code blocks are found, returns the original text.
 * @param text The markdown text containing code blocks
 * @returns The extracted code or original text if no code blocks found
 */
export function extractCodeBlocks(text: string): string {
    const tokens = marked.lexer(text);
    const codeBlocks = tokens
        .filter((token: any) => token.type === 'code')
        .map((token: any) => token.text);
    return codeBlocks.length ? codeBlocks.join('\n\n') : text;
}
