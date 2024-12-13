import { FENCE } from '../prompt/format';

interface CodeBlock {
    fileName?: string;
    language?: string;
    content: string;
}

class Coder {
    /**
     * Extracts search and replace content from a diff string using the defined fence markers
     */
    parseDiff(diffText: string): { search: string; replace: string } {
        const parts = diffText.split(FENCE.searchReplace.middle);
        if (parts.length !== 2) {
            throw new Error('Invalid diff format: Missing separator');
        }

        const search = parts[0].replace(FENCE.searchReplace.start, '').trim();

        const replace = parts[1].replace(FENCE.searchReplace.end, '').trim();

        return { search, replace };
    }

    /**
     * Applies a search/replace diff to the original text
     */
    applyDiff(originalText: string, diffText: string): string {
        const { search, replace } = this.parseDiff(diffText);

        if (!originalText.includes(search)) {
            throw new Error('Search text not found in original content');
        }

        return originalText.replace(search, replace);
    }

    /**
     * Creates a diff string using the defined fence markers
     */
    createDiff(search: string, replace: string): string {
        return [
            FENCE.searchReplace.start,
            search,
            FENCE.searchReplace.middle,
            replace,
            FENCE.searchReplace.end,
        ].join('\n');
    }

    /**
     * Extracts multiple code blocks from a string, including optional file names and languages
     * @param text String containing zero or more code blocks
     * @returns Array of code blocks with metadata
     */
    extractCodeBlocks(text: string): CodeBlock[] {
        // Matches: optional filename on previous line, fence start with optional language, content, fence end
        const blockRegex = /(?:([^\n]+)\n)?```(\w+)?\n([\s\S]*?)```/g;
        const matches = text.matchAll(blockRegex);

        return Array.from(matches).map((match) => ({
            ...(match[1] && { fileName: match[1].trim() }),
            ...(match[2] && { language: match[2] }),
            content: match[3].trim(),
        }));
    }
}

export { Coder };
