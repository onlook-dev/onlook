import { describe, expect, it } from 'bun:test';
import { diffWords } from 'diff';
import { readFileSync } from 'fs';
import path from 'path';
describe('Update Code', () => {
    it('match', () => {
        // Use current path of this file
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const original = readFileSync(`${__dirname}/code/before.tsx`, 'utf8');
        // Read output into blocks
        const output = readFileSync(`${__dirname}/code/output.json`, 'utf8');
        const response = JSON.parse(output);
        const block = response.blocks[1];
        console.log(block.original);
        const match = findBestMatch(original, block.original);
        // console.log('Match found at line:', match);

        expect(match).not.toBe(-1);
        // Add replacement and print result
        if (match !== -1) {
            const result = replaceCodeBlock(original, match, block.original, block.updated);
            const after = readFileSync(`${__dirname}/code/after.tsx`, 'utf8');
            expect(normalizeCode(result)).toEqual(normalizeCode(after));
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

function findBestMatch(source: string, target: string, threshold = 0.85): number {
    const normalizedTarget = normalizeCode(target);
    const sourceLines = source.split('\n');
    let bestMatchIndex = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < sourceLines.length; i++) {
        const windowSize = target.split('\n').length;
        const candidateBlock = sourceLines.slice(i, i + windowSize).join('\n');
        const normalizedCandidate = normalizeCode(candidateBlock);

        // Calculate similarity score using diff, ignoring all whitespace
        const differences = diffWords(normalizedCandidate, normalizedTarget, {
            ignoreWhitespace: true,
        });
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

function replaceCodeBlock(
    source: string,
    startIndex: number,
    originalBlock: string,
    newBlock: string,
): string {
    const sourceLines = source.split('\n');
    const blockLines = originalBlock.split('\n').length;

    // Replace the lines at the found index with the new block
    sourceLines.splice(startIndex, blockLines, ...newBlock.split('\n'));

    return sourceLines.join('\n');
}
