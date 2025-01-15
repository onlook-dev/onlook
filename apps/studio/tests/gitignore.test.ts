import { CUSTOM_OUTPUT_DIR } from '@onlook/models/constants';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { updateGitignore } from '../electron/main/hosting/helpers';

describe('updateGitignore', () => {
    const testDir = join(process.cwd(), 'test-project');
    const gitignorePath = join(testDir, '.gitignore');

    beforeEach(() => {
        // Create test directory if it doesn't exist
        if (!existsSync(testDir)) {
            mkdirSync(testDir);
        }
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(gitignorePath)) {
            unlinkSync(gitignorePath);
        }
        if (existsSync(testDir)) {
            rmdirSync(testDir);
        }
    });

    test('creates .gitignore with custom output dir when file does not exist', () => {
        updateGitignore(testDir, CUSTOM_OUTPUT_DIR);

        expect(existsSync(gitignorePath)).toBe(true);
        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toBe(CUSTOM_OUTPUT_DIR + '\n');
    });

    test('adds custom output dir when .gitignore exists but does not contain it', () => {
        writeFileSync(gitignorePath, 'node_modules\n');
        updateGitignore(testDir, CUSTOM_OUTPUT_DIR);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toBe('node_modules\n' + CUSTOM_OUTPUT_DIR + '\n');
    });

    test('does not add custom output dir when it already exists in .gitignore', () => {
        writeFileSync(gitignorePath, 'node_modules\n' + CUSTOM_OUTPUT_DIR + '\n');
        updateGitignore(testDir, CUSTOM_OUTPUT_DIR);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toBe('node_modules\n' + CUSTOM_OUTPUT_DIR + '\n');
    });

    test('handles custom output dir with surrounding whitespace', () => {
        writeFileSync(gitignorePath, 'node_modules\n  ' + CUSTOM_OUTPUT_DIR + '  \n');
        updateGitignore(testDir, CUSTOM_OUTPUT_DIR);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toBe('node_modules\n  ' + CUSTOM_OUTPUT_DIR + '  \n');
    });

    test('adds custom output dir with proper newline when file does not end with newline', () => {
        writeFileSync(gitignorePath, 'node_modules');
        updateGitignore(testDir, CUSTOM_OUTPUT_DIR);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toBe('node_modules\n' + CUSTOM_OUTPUT_DIR + '\n');
    });
});
