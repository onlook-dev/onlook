import { type CodeBlock } from '@onlook/models/chat/message';
import { FENCE } from '../prompt/format';

class CodeBlockProcessor {
    /**
     * Sequentially applies a list of diffs to the original text
     */
    applyDiffs(originalText: string, diffs: string[]): string {
        let text = originalText;
        for (const diff of diffs) {
            text = this.applyDiff(text, diff);
        }
        return text;
    }

    /**
     * Extracts search and replace content from a diff string using the defined fence markers
     */
    parseDiff(diffText: string): { search: string; replace: string } | null {
        try {
            // Find the content between start and middle fence
            const startIndex =
                diffText.indexOf(FENCE.searchReplace.start) + FENCE.searchReplace.start.length;
            const middleIndex = diffText.indexOf(FENCE.searchReplace.middle);

            // Find the content between middle and end fence
            const afterMiddleIndex = middleIndex + FENCE.searchReplace.middle.length;
            const endIndex = diffText.indexOf(FENCE.searchReplace.end);

            if (startIndex === -1 || middleIndex === -1 || endIndex === -1) {
                throw new Error('Missing fence markers');
            }

            const search = diffText.substring(startIndex, middleIndex).trim();
            const replace = diffText.substring(afterMiddleIndex, endIndex).trim();

            return { search, replace };
        } catch (error) {
            console.error('Invalid diff format', error);
            return null;
        }
    }

    /**
     * Applies a search/replace diff to the original text
     */
    applyDiff(originalText: string, diffText: string): string {
        const res = this.parseDiff(diffText);
        if (!res) {
            throw new Error('Invalid diff format');
        }

        const { search, replace } = res;
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

export { CodeBlockProcessor };
