import { describe, expect, it } from 'bun:test';
import { diffWords } from 'diff';
import { readFileSync } from 'fs';
import path from 'path';
describe('Update Code', () => {
    it('match', () => {
        // Use current path of this file
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const original = readFileSync(`${__dirname}/data/match/before.txt`, 'utf8');
        const after = readFileSync(`${__dirname}/data/match/after.txt`, 'utf8');

        // Read output into blocks
        const output = readFileSync(`${__dirname}/data/match/output.json`, 'utf8');
        const response = JSON.parse(output);
        const block = response.blocks[1];
        const match = findBestMatch(original, block.original);

        expect(match).not.toBeNull();
        if (match) {
            const result = replaceCodeBlock(original, match, block.updated);
            expect(result).toEqual(after);
        }
    });
});

function normalizeCode(code: string): string {
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

function findBestMatch(
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

function calculateSimilarity(normalizedCandidate: string, normalizedTarget: string): number {
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

function replaceCodeBlock(
    source: string,
    match: { start: number; end: number },
    newBlock: string,
): string {
    return source.slice(0, match.start) + newBlock + source.slice(match.end);
}
