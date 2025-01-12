import { diff_match_patch } from 'diff-match-patch';

/**
 * Types for search and replace operations
 */
export interface SearchReplaceStrategy {
    (
        searchText: string,
        replaceText: string,
        originalText: string,
    ): Promise<SearchReplaceResult> | SearchReplaceResult;
}

// Unique marker for outdenting in relative indentation
const OUTDENT_MARKER = '\u0001';

/**
 * Handles indentation transformation for better text matching
 */
export class RelativeIndenter {
    private readonly marker: string;

    constructor(marker: string = OUTDENT_MARKER) {
        this.marker = marker;
    }

    /**
     * Convert text to use relative indentation by replacing common indentation with markers
     */
    makeRelative(text: string): string {
        if (!text) return text;

        const lines = text.split('\n');
        if (lines.length === 0) return text;

        // Process each line to convert spaces to markers
        return lines
            .map((line) => {
                if (line.trim().length === 0) return line;
                const indent = line.match(/^\s*/)?.[0] ?? '';
                return this.marker.repeat(indent.length) + line.slice(indent.length);
            })
            .join('\n');
    }

    /**
     * Convert text back to absolute indentation by replacing markers with spaces
     */
    makeAbsolute(text: string): string {
        if (!text) return text;

        // Replace markers with spaces
        return text
            .split('\n')
            .map((line) => {
                const markerMatch = line.match(new RegExp(`^${this.marker}+`));
                if (!markerMatch) return line;
                return ' '.repeat(markerMatch[0].length) + line.slice(markerMatch[0].length);
            })
            .join('\n');
    }
}

/**
 * Preprocessing options for text transformation
 */
export interface PreprocessOptions {
    stripBlankLines: boolean;
    relativeIndent: boolean;
    reverseLines: boolean;
}

/**
 * Result of a search and replace operation
 */
export interface SearchReplaceResult {
    success: boolean;
    text?: string;
    error?: string;
}

/**
 * Direct string replacement strategy
 */
/**
 * Helper function to strip blank lines from start and end of text
 */
function stripBlankLines(text: string): string {
    const lines = text.split('\n');
    let start = 0;
    let end = lines.length - 1;

    while (start <= end && lines[start].trim() === '') start++;
    while (end >= start && lines[end].trim() === '') end--;

    return lines.slice(start, end + 1).join('\n');
}

/**
 * Helper function to reverse lines in text
 */
function reverseLines(text: string): string {
    return text.split('\n').reverse().join('\n');
}

/**
 * Direct string replacement strategy
 */
export function searchAndReplace(
    searchText: string,
    replaceText: string,
    originalText: string,
): SearchReplaceResult {
    try {
        const occurrences = originalText.split(searchText).length - 1;
        if (occurrences === 0) {
            return { success: false, error: 'Search text not found' };
        }
        if (occurrences > 1) {
            return { success: false, error: 'Search text not unique' };
        }

        const newText = originalText.replace(searchText, replaceText);
        return { success: true, text: newText };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Diff-match-patch based line-by-line diffing strategy
 */
export function dmpLinesApply(
    searchText: string,
    replaceText: string,
    originalText: string,
): SearchReplaceResult {
    try {
        const dmp = new diff_match_patch();

        // Split texts into lines
        const searchLines = searchText.split('\n');
        const replaceLines = replaceText.split('\n');
        const originalLines = originalText.split('\n');

        // Find the search text in the original
        let startLine = -1;
        for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
            let match = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (originalLines[i + j] !== searchLines[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                if (startLine !== -1) {
                    return { success: false, error: 'Search text not unique' };
                }
                startLine = i;
            }
        }

        if (startLine === -1) {
            return { success: false, error: 'Search text not found' };
        }

        // Replace the lines
        const newLines = [
            ...originalLines.slice(0, startLine),
            ...replaceLines,
            ...originalLines.slice(startLine + searchLines.length),
        ];

        return { success: true, text: newLines.join('\n') };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Tries multiple strategies to perform search and replace
 */
export async function flexibleSearchAndReplace(
    searchText: string,
    replaceText: string,
    originalText: string,
    options: Partial<PreprocessOptions> = {},
): Promise<SearchReplaceResult> {
    const {
        stripBlankLines: useStripBlank = false,
        relativeIndent: useRelativeIndent = false,
        reverseLines: useReverse = false,
    } = options;

    // Initialize preprocessing tools
    const indenter = new RelativeIndenter();

    // Define preprocessing combinations
    const preprocessCombinations = [
        { stripBlank: false, relIndent: false, rev: false },
        { stripBlank: true, relIndent: false, rev: false },
        { stripBlank: false, relIndent: true, rev: false },
        { stripBlank: true, relIndent: true, rev: false },
        { stripBlank: false, relIndent: false, rev: true },
    ].filter(
        (combo) =>
            (!combo.stripBlank || useStripBlank) &&
            (!combo.relIndent || useRelativeIndent) &&
            (!combo.rev || useReverse),
    );

    // Try each preprocessing combination with each strategy
    for (const combo of preprocessCombinations) {
        let processedSearch = searchText;
        let processedReplace = replaceText;
        let processedOriginal = originalText;

        // Apply preprocessing
        if (combo.stripBlank) {
            processedSearch = stripBlankLines(processedSearch);
            processedReplace = stripBlankLines(processedReplace);
            processedOriginal = stripBlankLines(processedOriginal);
        }

        if (combo.relIndent) {
            processedSearch = indenter.makeRelative(processedSearch);
            processedReplace = indenter.makeRelative(processedReplace);
            processedOriginal = indenter.makeRelative(processedOriginal);
        }

        if (combo.rev) {
            processedSearch = reverseLines(processedSearch);
            processedReplace = reverseLines(processedReplace);
            processedOriginal = reverseLines(processedOriginal);
        }

        // Try each strategy
        const strategies: SearchReplaceStrategy[] = [searchAndReplace, dmpLinesApply];

        for (const strategy of strategies) {
            const result = await Promise.resolve(
                strategy(processedSearch, processedReplace, processedOriginal),
            );

            if (result.success && result.text) {
                let finalText = result.text;

                // Reverse preprocessing
                if (combo.rev) {
                    finalText = reverseLines(finalText);
                }

                if (combo.relIndent) {
                    finalText = indenter.makeAbsolute(finalText);
                }

                return { success: true, text: finalText };
            }
        }
    }

    return { success: false, error: 'No strategy succeeded' };
}
