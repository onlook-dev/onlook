import { type CodeBlock } from '@onlook/models/chat/message';
import { FENCE } from '../prompt/format';
import { flexibleSearchAndReplace } from './search-replace';

export class CodeBlockProcessor {
    /**
     * Sequentially applies a list of diffs to the original text
     * Returns the resulting text after applying all possible diffs
     * If a diff cannot be applied, it is skipped and the method continues with the next diff
     * @returns An object containing the modified text and information about failed diffs
     */
    async applyDiffs(originalText: string, diffs: string[]): Promise<{ 
        text: string; 
        failures: { diffIndex: number; error: string }[] 
    }> {
        let text = originalText;
        const failures: { diffIndex: number; error: string }[] = [];
        
        for (let i = 0; i < diffs.length; i++) {
            try {
                const searchReplaces = CodeBlockProcessor.parseDiff(diffs[i]);
                if (searchReplaces.length === 0) {
                    failures.push({ diffIndex: i, error: 'Invalid diff format - No valid fence blocks found' });
                    continue;
                }
                
                let diffApplied = false;
                let currentText = text;
                
                for (const { search, replace } of searchReplaces) {
                    const result = await flexibleSearchAndReplace(search, replace, currentText);
                    if (result.success && result.text) {
                        currentText = result.text;
                        diffApplied = true;
                    } else {
                        failures.push({ 
                            diffIndex: i, 
                            error: result.error || 'Search pattern not found or other error occurred' 
                        });
                    }
                }
                
                if (diffApplied) {
                    text = currentText;
                }
            } catch (error) {
                failures.push({ 
                    diffIndex: i, 
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        
        return { text, failures };
    }

    /**
     * Extracts search and replace content from a diff string using the defined fence markers
     */
    static parseDiff(diffText: string): { search: string; replace: string }[] {
        try {
            const results: { search: string; replace: string }[] = [];
            let currentIndex = 0;

            while (true) {
                const startIndex = diffText.indexOf(FENCE.searchReplace.start, currentIndex);
                if (startIndex === -1) break;

                const middleIndex = diffText.indexOf(FENCE.searchReplace.middle, startIndex);
                const endIndex = diffText.indexOf(FENCE.searchReplace.end, middleIndex);

                if (middleIndex === -1 || endIndex === -1) {
                    throw new Error('Incomplete fence markers');
                }

                const searchStart = startIndex + FENCE.searchReplace.start.length;
                const replaceStart = middleIndex + FENCE.searchReplace.middle.length;

                const search = diffText.substring(searchStart, middleIndex).trim();
                const replace = diffText.substring(replaceStart, endIndex).trim();

                results.push({ search, replace });
                currentIndex = endIndex + FENCE.searchReplace.end.length;
            }

            if (results.length === 0) {
                throw new Error('No valid fence blocks found');
            }

            return results;
        } catch (error) {
            console.warn('Invalid diff format', error);
            return [];
        }
    }

    /**
     * Applies a search/replace diff to the original text with advanced formatting handling
     * Uses multiple strategies and preprocessing options to handle complex replacements
     * @returns The modified text if successful, or the original text if all search/replace operations failed
     */
    async applyDiff(originalText: string, diffText: string): Promise<string> {
        const searchReplaces = CodeBlockProcessor.parseDiff(diffText);
        let text = originalText;
        let anySuccess = false;

        for (const { search, replace } of searchReplaces) {
            const result = await flexibleSearchAndReplace(search, replace, text);
            if (result.success && result.text) {
                text = result.text;
                anySuccess = true;
            } else {
                // Fallback to simple replacement if flexible strategies fail
                try {
                    const newText = text.replace(search, replace);
                    if (newText !== text) {
                        text = newText;
                        anySuccess = true;
                    }
                } catch (error) {
                    // Continue if simple replacement fails
                    console.warn('Simple replacement failed:', error);
                }
            }
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
