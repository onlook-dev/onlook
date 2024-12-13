import { FENCE } from '../prompt/format';

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
     * Extracts code content from between code fence markers
     */
    extractCode(codeBlock: string): string {
        const match = codeBlock.match(/```.*?\n([\s\S]*?)```/);
        if (!match) {
            throw new Error('No code block found');
        }
        return match[1].trim();
    }
}

export { Coder };
