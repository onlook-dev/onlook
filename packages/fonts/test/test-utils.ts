import { expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';

export interface TestCaseConfig {
    casesDir: string;
    inputFileName?: string; // defaults to 'input' if not specified
    expectedFileName?: string; // defaults to 'expected' if not specified
}

export type TestProcessor<T = any> = (input: T, filePath?: string) => Promise<string> | string;
export type InputParser<T = any> = (content: string, filePath?: string) => T | Promise<T>;

/**
 * Runs data-driven tests for a given test cases directory.
 * Each test case folder should contain input files and expected output files.
 *
 * @param config - Test configuration including directory and file names
 * @param processor - Function that processes input and returns result string
 * @param inputParser - Optional function to parse input file content (defaults to reading as text)
 */
export function runDataDrivenTests<T = string>(
    config: TestCaseConfig,
    processor: TestProcessor<T>,
    inputParser?: InputParser<T>,
): void {
    const { casesDir, inputFileName = 'input', expectedFileName = 'expected' } = config;

    // Check if test cases directory exists
    if (!fs.existsSync(casesDir)) {
        test.skip('Test cases directory does not exist yet', () => {});
        return;
    }

    const testCases = fs.readdirSync(casesDir);

    for (const testCase of testCases) {
        test(`should handle case: ${testCase}`, async () => {
            const caseDir = path.resolve(casesDir, testCase);
            const files = fs.readdirSync(caseDir);

            // Find input file (could be input.tsx, config.json, etc.)
            const inputFile = files.find((f) => {
                const nameWithoutExt = f.split('.')[0];
                return nameWithoutExt === inputFileName;
            });

            // Find expected file (usually expected.tsx)
            const expectedFile = files.find((f) => {
                const nameWithoutExt = f.split('.')[0];
                return nameWithoutExt === expectedFileName;
            });

            if (!inputFile || !expectedFile) {
                throw new Error(
                    `Test case ${testCase} is missing ${inputFileName} or ${expectedFileName} file.`,
                );
            }

            const inputPath = path.resolve(caseDir, inputFile);
            const expectedPath = path.resolve(caseDir, expectedFile);

            // Read and parse input
            const inputContent = await Bun.file(inputPath).text();
            const parsedInput = inputParser
                ? await inputParser(inputContent, inputPath)
                : (inputContent as T);

            // Process input through the provided processor
            const result = await processor(parsedInput, inputPath);

            // Compare with expected output
            const expectedContent = await Bun.file(expectedPath).text();
            expect(result.trim()).toBe(expectedContent.trim());
        });
    }
}
