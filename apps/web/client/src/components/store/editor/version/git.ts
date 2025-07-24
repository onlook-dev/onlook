import { type GitCommit } from '@onlook/git';
import type { EditorEngine } from '../engine';

export const ONLOOK_DISPLAY_NAME_NOTE_REF = 'refs/notes/onlook-display-name';

export interface GitStatus {
    files: string[];
}

export interface GitCommandResult {
    success: boolean;
    output: string;
    error: string | null;
}

export class GitManager {
    constructor(private editorEngine: EditorEngine) { }

    /**
     * Check if git repository is initialized
     */
    async isRepoInitialized(): Promise<boolean> {
        try {
            return (await this.editorEngine?.sandbox.fileExists('.git')) || false;
        } catch (error) {
            console.error('Error checking if repository is initialized:', error);
            return false;
        }
    }

    /**
     * Ensure git config is set with default values if not already configured
     */
    async ensureGitConfig(): Promise<boolean> {
        try {
            if (!this.editorEngine?.sandbox?.session) {
                console.error('No editor engine or session available');
                return false;
            }

            // Check if user.name is set
            const nameResult = await this.runCommand('git config user.name');
            const emailResult = await this.runCommand('git config user.email');

            const hasName = nameResult.success && nameResult.output.trim();
            const hasEmail = emailResult.success && emailResult.output.trim();

            // If both are already set, no need to configure
            if (hasName && hasEmail) {
                return true;
            }

            // Set user.name if not configured
            if (!hasName) {
                const nameConfigResult = await this.runCommand('git config user.name "Onlook"');
                if (!nameConfigResult.success) {
                    console.error('Failed to set git user.name:', nameConfigResult.error);
                }
            }

            // Set user.email if not configured
            if (!hasEmail) {
                const emailConfigResult = await this.runCommand(
                    'git config user.email "support@onlook.com"',
                );
                if (!emailConfigResult.success) {
                    console.error('Failed to set git user.email:', emailConfigResult.error);
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to ensure git config:', error);
            return false;
        }
    }

    /**
     * Initialize git repository
     */
    async initRepo(): Promise<boolean> {
        try {
            const isInitialized = await this.isRepoInitialized();
            if (isInitialized) {
                console.log('Repository already initialized');
                return true;
            }

            if (!this.editorEngine?.sandbox?.session) {
                console.error('No editor engine or session available');
                return false;
            }

            console.log('Initializing git repository...');

            // Initialize git repository
            const initResult = await this.runCommand('git init');
            if (!initResult.success) {
                console.error('Failed to initialize git repository:', initResult.error);
                return false;
            }

            // Configure git user (required for commits)
            await this.ensureGitConfig();

            // Set default branch to main
            await this.runCommand('git branch -M main');

            console.log('Git repository initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize git repository:', error);
            return false;
        }
    }

    /**
     * Get repository status
     */
    async getStatus(): Promise<GitStatus | null> {
        try {
            const status = await this.editorEngine?.sandbox.session.session?.git.status();
            if (!status) {
                console.error('Failed to get git status');
                return null;
            }

            return {
                files: Object.keys(status.changedFiles || {}),
            };
        } catch (error) {
            console.error('Failed to get git status:', error);
            return null;
        }
    }

    /**
     * Stage all files
     */
    async stageAll(): Promise<GitCommandResult> {
        return this.runCommand('git add .');
    }

    /**
     * Create a commit
     */
    async commit(message: string): Promise<GitCommandResult> {
        const escapedMessage = message.replace(/\"/g, '\\"');
        return this.runCommand(`git commit --allow-empty --no-verify -m "${escapedMessage}"`);
    }

    /**
     * List commits with formatted output
     */
    async listCommits(): Promise<GitCommit[]> {
        try {
            const result = await this.runCommand(
                'git log --pretty=format:"%H|%an <%ae>|%ad|%s" --date=iso',
            );

            if (result.success && result.output) {
                return this.parseGitLog(result.output);
            }

            return [];
        } catch (error) {
            console.error('Failed to list commits', error);
            return [];
        }
    }

    /**
     * Checkout/restore to a specific commit
     */
    async restoreToCommit(commitOid: string): Promise<GitCommandResult> {
        return this.runCommand(`git restore --source ${commitOid} .`);
    }

    /**
     * Add a display name note to a commit
     */
    async addCommitNote(commitOid: string, displayName: string): Promise<GitCommandResult> {
        const escapedDisplayName = displayName.replace(/\"/g, '\\"');
        return this.runCommand(
            `git notes --ref=${ONLOOK_DISPLAY_NAME_NOTE_REF} add -f -m "${escapedDisplayName}" ${commitOid}`,
        );
    }

    /**
     * Get display name from commit notes
     */
    async getCommitNote(commitOid: string): Promise<string | null> {
        try {
            const result = await this.runCommand(
                `git notes --ref=${ONLOOK_DISPLAY_NAME_NOTE_REF} show ${commitOid}`,
                true,
            );
            return result.success ? this.formatGitLogOutput(result.output) : null;
        } catch (error) {
            console.warn('Failed to get commit note', error);
            return null;
        }
    }

    /**
     * Run a git command through the sandbox session
     */
    private async runCommand(command: string, ignoreError: boolean = false): Promise<GitCommandResult> {
        try {
            if (!this.editorEngine?.sandbox?.session) {
                return {
                    success: false,
                    output: '',
                    error: 'No session available',
                };
            }

            let result = await this.editorEngine.sandbox.session.runCommand(command + (ignoreError ? ' 2>/dev/null || true' : ''));

            if (!result.success) {
                throw new Error(result.error ?? 'Failed to run command');
            }

            return result;
        } catch (error) {
            console.error(`Error running command: ${command}`, error);
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Parse git log output into GitCommit objects
     */
    private parseGitLog(rawOutput: string): GitCommit[] {
        const cleanOutput = this.formatGitLogOutput(rawOutput);

        if (!cleanOutput) {
            return [];
        }

        const commits: GitCommit[] = [];
        const lines = cleanOutput.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            if (!line.trim()) continue;

            // Handle the new format: <hash>|<author>|<date>|<message>
            // The hash might have a prefix that we need to handle
            let cleanLine = line;

            // If line starts with escape sequences followed by =, extract everything after =
            const escapeMatch = cleanLine.match(/^[^\w]*=?(.+)$/);
            if (escapeMatch) {
                cleanLine = escapeMatch[1] || '';
            }

            const parts = cleanLine.split('|');
            if (parts.length >= 4) {
                const hash = parts[0]?.trim();
                const authorLine = parts[1]?.trim();
                const dateLine = parts[2]?.trim();
                const message = parts.slice(3).join('|').trim();

                if (!hash || !authorLine || !dateLine) continue;

                // Parse author name and email
                const authorMatch = authorLine.match(/^(.+?)\s*<(.+?)>$/);
                const authorName = authorMatch?.[1]?.trim() || authorLine;
                const authorEmail = authorMatch?.[2]?.trim() || '';

                // Parse date to timestamp
                const timestamp = Math.floor(new Date(dateLine).getTime() / 1000);

                commits.push({
                    oid: hash,
                    message: message || 'No message',
                    author: {
                        name: authorName,
                        email: authorEmail,
                    },
                    timestamp: timestamp,
                    displayName: message || null,
                });
            }
        }

        return commits;
    }

    private formatGitLogOutput(input: string): string {
        // Handle sequences with ESC characters anywhere within them
        // Pattern to match sequences like [?1h<ESC>= and [K<ESC>[?1l<ESC>>
        const ansiWithEscPattern = /\[[0-9;?a-zA-Z\x1b]*[a-zA-Z=>/]*/g;

        // Handle standard ANSI escape sequences starting with ESC
        const ansiEscapePattern = /\x1b\[[0-9;?a-zA-Z]*[a-zA-Z=>/]*/g;

        // Handle control characters
        const controlChars = /[\x00-\x09\x0B-\x1F\x7F]/g;

        const cleanOutput = input
            .replace(ansiWithEscPattern, '') // Remove sequences with ESC chars in middle
            .replace(ansiEscapePattern, '') // Remove standard ESC sequences
            .replace(controlChars, '') // Remove control characters
            .trim();

        return cleanOutput;
    }
}
