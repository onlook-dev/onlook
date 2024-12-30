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
    parseDiff(diffText: string): { search: string; replace: string }[] {
        try {
            const results: { search: string; replace: string }[] = [];
            let currentIndex = 0;

            while (true) {
                // Find next set of fence markers
                const startIndex = diffText.indexOf(FENCE.searchReplace.start, currentIndex);
                if (startIndex === -1) break; // No more fence blocks found

                const middleIndex = diffText.indexOf(FENCE.searchReplace.middle, startIndex);
                const endIndex = diffText.indexOf(FENCE.searchReplace.end, middleIndex);

                if (middleIndex === -1 || endIndex === -1) {
                    throw new Error('Incomplete fence markers');
                }

                // Extract search and replace content
                const searchStart = startIndex + FENCE.searchReplace.start.length;
                const replaceStart = middleIndex + FENCE.searchReplace.middle.length;

                const search = diffText.substring(searchStart, middleIndex).trim();
                const replace = diffText.substring(replaceStart, endIndex).trim();

                results.push({ search, replace });

                // Move to position after current block
                currentIndex = endIndex + FENCE.searchReplace.end.length;
            }

            if (results.length === 0) {
                throw new Error('No valid fence blocks found');
            }

            return results;
        } catch (error) {
            console.error('Invalid diff format', error);
            return [];
        }
    }

    /**
     * Applies a search/replace diff to the original text
     */
    applyDiff(originalText: string, diffText: string): string {
        const res = this.parseDiff(diffText);

        let text = originalText;
        for (const { search, replace } of res) {
            text = text.replace(search, replace);
        }
        return text;
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
