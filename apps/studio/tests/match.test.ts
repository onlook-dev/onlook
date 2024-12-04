import { describe, it } from 'bun:test';
import { diffWords } from 'diff';
import { readFileSync } from 'fs';
import path from 'path';
describe('Update Code', () => {
    it('match', () => {
        // Use current path of this file
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const original = readFileSync(`${__dirname}/code/before.tsx`, 'utf8');
        const updated = readFileSync(`${__dirname}/code/after.tsx`, 'utf8');
        // Read output into blocks
        const output = readFileSync(`${__dirname}/code/output.json`, 'utf8');
        const response = JSON.parse(output);
        const block = response.blocks[1];
        const match = findBestMatch(original, block.original);
        console.log(match);
    });
});

function normalizeCode(code: string): string {
    return code.replace(/\s+/g, ' ').replace(/["']/g, '"').trim();
}

function findBestMatch(source: string, target: string, threshold = 0.85): number {
    const normalizedTarget = normalizeCode(target);
    const sourceLines = source.split('\n');
    let bestMatchIndex = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < sourceLines.length; i++) {
        const windowSize = target.split('\n').length;
        const candidateBlock = sourceLines.slice(i, i + windowSize).join('\n');
        const normalizedCandidate = normalizeCode(candidateBlock);

        // Calculate similarity score using diff
        const differences = diffWords(normalizedCandidate, normalizedTarget);
        const similarityScore =
            differences.reduce((score, part) => {
                if (!part.added && !part.removed) {
                    return score + part.value.length;
                }
                return score;
            }, 0) / Math.max(normalizedCandidate.length, normalizedTarget.length);

        if (similarityScore > bestMatchScore && similarityScore >= threshold) {
            bestMatchScore = similarityScore;
            bestMatchIndex = i;
        }
    }

    return bestMatchIndex;
}
