import { prepareCommitMessage, sanitizeCommitMessage } from '@/utils/git';
import { type GitCommit } from '@onlook/git';
import stripAnsi from 'strip-ansi';
import type { EditorEngine } from '../engine';
import { SUPPORT_EMAIL } from '@onlook/constants';

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
                    `git config user.email "${SUPPORT_EMAIL}"`,
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
            const status = await this.editorEngine?.sandbox.session.provider?.gitStatus({});
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
        const sanitizedMessage = sanitizeCommitMessage(message);
        const escapedMessage = prepareCommitMessage(sanitizedMessage);
        return this.runCommand(`git commit --allow-empty --no-verify -m ${escapedMessage}`);
    }

    /**
     * List commits with formatted output
     */
    async listCommits(maxRetries = 2): Promise<GitCommit[]> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Use a more robust format with unique separators and handle multiline messages
                const result = await this.runCommand(
                    'git --no-pager log --pretty=format:"COMMIT_START%n%H%n%an <%ae>%n%ad%n%B%nCOMMIT_END" --date=iso',
                );

                if (result.success && result.output) {
                    return this.parseGitLog(result.output);
                }

                // If git command failed but didn't throw, treat as error for retry logic
                lastError = new Error(`Git command failed: ${result.error || 'Unknown error'}`);

                if (attempt < maxRetries) {
                    // Wait before retry with exponential backoff
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
                    continue;
                }

                return [];
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Attempt ${attempt + 1} failed to list commits:`, lastError.message);

                if (attempt < maxRetries) {
                    // Wait before retry with exponential backoff
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
                    continue;
                }

                console.error('All attempts failed to list commits', lastError);
                return [];
            }
        }

        return [];
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
        const sanitizedDisplayName = sanitizeCommitMessage(displayName);
        const escapedDisplayName = prepareCommitMessage(sanitizedDisplayName);
        return this.runCommand(
            `git --no-pager notes --ref=${ONLOOK_DISPLAY_NAME_NOTE_REF} add -f -m ${escapedDisplayName} ${commitOid}`,
        );
    }

    /**
     * Get display name from commit notes
     */
    async getCommitNote(commitOid: string): Promise<string | null> {
        try {
            const result = await this.runCommand(
                `git --no-pager notes --ref=${ONLOOK_DISPLAY_NAME_NOTE_REF} show ${commitOid}`,
                true,
            );
            if (result.success && result.output) {
                const cleanOutput = this.formatGitLogOutput(result.output);
                return cleanOutput || null;
            }
            return null;
        } catch (error) {
            console.warn('Failed to get commit note', error);
            return null;
        }
    }

    /**
     * Run a git command through the sandbox session
     */
    private runCommand(command: string, ignoreError: boolean = false): Promise<GitCommandResult> {
        return this.editorEngine.sandbox.session.runCommand(
            command + (ignoreError ? ' 2>/dev/null || true' : ''),
        );
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

        // Split by COMMIT_START and COMMIT_END markers
        const commitBlocks = cleanOutput.split('COMMIT_START').filter((block) => block.trim());

        for (const block of commitBlocks) {
            // Remove COMMIT_END if present
            const cleanBlock = block.replace(/COMMIT_END\s*$/, '').trim();
            if (!cleanBlock) continue;

            // Split the block into lines
            const lines = cleanBlock.split('\n');

            if (lines.length < 4) continue; // Need at least hash, author, date, and message

            const hash = lines[0]?.trim();
            const authorLine = lines[1]?.trim();
            const dateLine = lines[2]?.trim();

            // Everything from line 3 onwards is the commit message (including empty lines)
            const messageLines = lines.slice(3);
            // Join all message lines and trim only leading/trailing whitespace
            const message = messageLines.join('\n').trim();

            if (!hash || !authorLine || !dateLine) continue;

            // Parse author name and email
            const authorMatch = authorLine.match(/^(.+?)\s*<(.+?)>$/);
            const authorName = authorMatch?.[1]?.trim() || authorLine;
            const authorEmail = authorMatch?.[2]?.trim() || '';

            // Parse date to timestamp
            let timestamp: number;
            try {
                timestamp = Math.floor(new Date(dateLine).getTime() / 1000);
                // Validate timestamp
                if (isNaN(timestamp) || timestamp < 0) {
                    timestamp = Math.floor(Date.now() / 1000);
                }
            } catch (error) {
                console.warn('Failed to parse commit date:', dateLine, error);
                timestamp = Math.floor(Date.now() / 1000);
            }

            // Use the first line of the message as display name, or the full message if it's short
            const displayMessage = message.split('\n')[0] || 'No message';

            commits.push({
                oid: hash,
                message: message || 'No message',
                author: {
                    name: authorName,
                    email: authorEmail,
                },
                timestamp: timestamp,
                displayName: displayMessage,
            });
        }

        return commits;
    }

    private formatGitLogOutput(input: string): string {
        // Use strip-ansi library for robust ANSI escape sequence removal
        let cleanOutput = stripAnsi(input);

        // Remove any remaining control characters except newline and tab
        cleanOutput = cleanOutput.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Remove null bytes
        cleanOutput = cleanOutput.replace(/\0/g, '');

        return cleanOutput.trim();
    }
}
