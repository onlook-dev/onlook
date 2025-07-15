import { formatGitLogOutput, GIT_AUTHOR, parseGitLog, type GitCommit } from '@onlook/git';
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
                const nameConfigResult = await this.runCommand(`git config user.name "${GIT_AUTHOR.name}"`);
                if (!nameConfigResult.success) {
                    console.error('Failed to set git user.name:', nameConfigResult.error);
                }
            }

            // Set user.email if not configured
            if (!hasEmail) {
                const emailConfigResult = await this.runCommand(
                    `git config user.email "${GIT_AUTHOR.email}"`,
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
            const statusResult = await this.runCommand('git status');
            if (!statusResult.success) {
                console.error('Failed to get git status');
                return null;
            }

            const files = statusResult.output.split('\n').filter((line) => line.trim());

            return {
                files,
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
                return parseGitLog(result.output);
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
            return result.success ? formatGitLogOutput(result.output) : null;
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
}
