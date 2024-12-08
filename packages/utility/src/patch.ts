import { diffWords } from 'diff';

export function findAndReplace(fullText: string, original: string, updated: string): string {
    const match = findBestMatch(fullText, original);
    if (match) {
        return replaceCodeBlock(fullText, match, updated);
    }
    console.warn('No match found for code update');
    return fullText;
}

export function normalizeCode(code: string): string {
    return code
        .replace(/\r\n|\r|\n/g, '\n') // Normalize all line ending variants
        .split('\n')
        .filter((line) => line.trim() !== '') // Remove empty lines
        .join('\n')
        .replace(/\s+/g, ' ') // Normalize all whitespace
        .replace(/["'`]/g, '"') // Normalize quotes (including backticks)
        .replace(/\u200B/g, '') // Remove zero-width spaces
        .replace(/\uFEFF/g, '') // Remove byte order marks
        .trim();
}

export function findBestMatch(
    source: string,
    target: string,
    threshold = 0.85,
): { start: number; end: number } | null {
    const normalizedTarget = normalizeCode(target);
    let bestMatch = null;
    let bestMatchScore = 0;

    // Optimization 1: Skip iterations if remaining text is shorter than target
    const maxStartIndex = source.length - target.length;

    const stepSize = 3;
    // First pass: Scan with larger steps
    for (let i = 0; i <= maxStartIndex; i += stepSize) {
        const candidateBlock = source.slice(i, i + target.length);
        const normalizedCandidate = normalizeCode(candidateBlock);

        // If length difference is too large, skip
        if (
            Math.abs(normalizedCandidate.length - normalizedTarget.length) >
            normalizedTarget.length * 0.2
        ) {
            continue;
        }

        const similarityScore = calculateSimilarity(normalizedCandidate, normalizedTarget);

        if (similarityScore > bestMatchScore && similarityScore >= threshold) {
            // Fine-grained search around good matches
            for (
                let j = Math.max(0, i - stepSize);
                j <= Math.min(i + stepSize, maxStartIndex);
                j++
            ) {
                const fineBlock = source.slice(j, j + target.length);
                const fineScore = calculateSimilarity(normalizeCode(fineBlock), normalizedTarget);

                if (fineScore > bestMatchScore) {
                    bestMatchScore = fineScore;
                    bestMatch = { start: j, end: j + target.length };
                }
            }
        }
    }

    return bestMatch;
}

export function calculateSimilarity(normalizedCandidate: string, normalizedTarget: string): number {
    const differences = diffWords(normalizedCandidate, normalizedTarget, {
        ignoreWhitespace: true,
    });

    return (
        differences.reduce((score, part) => {
            if (!part.added && !part.removed) {
                return score + part.value.length;
            }
            return score;
        }, 0) / Math.max(normalizedCandidate.length, normalizedTarget.length)
    );
}

export function replaceCodeBlock(
    source: string,
    match: { start: number; end: number },
    newBlock: string,
): string {
    return source.slice(0, match.start) + newBlock + source.slice(match.end);
}
