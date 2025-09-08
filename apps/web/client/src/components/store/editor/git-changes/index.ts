import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import type { GitStatus } from '../version/git';
import type { FileEvent } from '../sandbox/file-event-bus';

export interface GitFileStatus {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
    staged: boolean;
    hasConflicts: boolean;
}

export interface GitRepository {
    name: string;
    fullName: string;
    htmlUrl: string;
    owner: string;
    defaultBranch: string;
    isConnected: boolean;
}

export interface CommitInfo {
    message: string;
    description?: string;
    author?: {
        name: string;
        email: string;
    };
}

/**
 * Manages Git changes, staging, and commit/push operations for the active branch
 */
export class GitChangesManager {
    files: GitFileStatus[] = [];
    isLoadingStatus = false;
    isCommitting = false;
    isPushing = false;
    connectedRepo: GitRepository | null = null;
    lastStatusUpdate: number = 0;
    private updateInterval: NodeJS.Timeout | null = null;
    private sessionCheckTimeout: NodeJS.Timeout | null = null;
    private retryAttempts: number = 0;
    private maxRetryAttempts: number = 5;
    private isSessionReady: boolean = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async init() {
        // Only initialize if we have an active branch
        try {
            const activeBranch = this.editorEngine.branches.activeBranch;
            if (!activeBranch) {
                return;
            }
        } catch (error) {
            // No active branch yet, skip initialization
            return;
        }
        
        // Subscribe to file changes for real-time updates
        this.editorEngine.activeSandbox.fileEventBus.subscribe('*', this.handleFileChange.bind(this));
        
        // Start session readiness check with exponential backoff
        this.checkSessionReadiness();
    }

    /**
     * Check if session is ready with exponential backoff
     */
    private checkSessionReadiness() {
        const activeSandbox = this.editorEngine.activeSandbox;
        
        if (activeSandbox?.session?.provider) {
            this.isSessionReady = true;
            this.retryAttempts = 0;
            
            // Start periodic status updates only when session is ready
            this.refreshStatus();
            this.updateInterval = setInterval(() => {
                if (this.isSessionReady) {
                    this.refreshStatus();
                }
            }, 30000); // Refresh every 30 seconds instead of 10
            
            return;
        }
        
        // If max retries reached, stop trying
        if (this.retryAttempts >= this.maxRetryAttempts) {
            console.warn('Max session readiness check attempts reached. Stopping git status checks.');
            return;
        }
        
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = Math.pow(2, this.retryAttempts) * 2000;
        this.retryAttempts++;
        
        this.sessionCheckTimeout = setTimeout(() => {
            this.checkSessionReadiness();
        }, delay);
    }

    private async handleFileChange(event: FileEvent) {
        // Only handle file changes if session is ready
        if (!this.isSessionReady) {
            return;
        }
        
        // Filter out irrelevant file changes (node_modules, .git, etc.)
        const relevantPaths = event.paths.filter(path => {
            const normalizedPath = path.toLowerCase();
            return !normalizedPath.includes('node_modules') &&
                   !normalizedPath.includes('.git/') &&
                   !normalizedPath.includes('.next/') &&
                   !normalizedPath.includes('dist/') &&
                   !normalizedPath.includes('build/') &&
                   !normalizedPath.startsWith('.') &&
                   !normalizedPath.endsWith('.log');
        });
        
        if (relevantPaths.length === 0) {
            return; // No relevant files changed
        }
        
        // Debounce status updates to avoid excessive Git calls
        const now = Date.now();
        if (now - this.lastStatusUpdate < 1500) { // Reduced debounce to be more responsive
            return;
        }
        
        this.lastStatusUpdate = now;
        // Quick refresh for file changes
        setTimeout(() => this.refreshStatus(), 500);
    }

    /**
     * Refresh Git status and update file list
     */
    async refreshStatus(): Promise<void> {
        // Early return if already loading, session not ready, or no active branch
        if (this.isLoadingStatus || !this.isSessionReady) {
            return;
        }
        
        this.isLoadingStatus = true;
        
        try {
            const activeSandbox = this.editorEngine.activeSandbox;
            
            // Final check for session provider availability
            if (!activeSandbox?.session?.provider) {
                this.isSessionReady = false;
                this.checkSessionReadiness(); // Restart session check
                return;
            }

            // Ensure Git is initialized
            try {
                await this.editorEngine.versions.initializeRepo();
                
                // Get actual git status using git status --porcelain
                const statusResult = await activeSandbox.session.runCommand('git status --porcelain', undefined, true);
                
                if (statusResult.success && statusResult.output) {
                    this.files = await this.parseGitStatusOutput(statusResult.output.trim());
                } else {
                    // If git status fails, try to detect if we're in a git repo
                    const gitCheckResult = await activeSandbox.session.runCommand('git rev-parse --is-inside-work-tree', undefined, true);
                    if (gitCheckResult.success) {
                        // We're in a git repo but no changes
                        this.files = [];
                    } else {
                        // Not a git repo, clear files
                        this.files = [];
                    }
                }
            } catch (gitError) {
                // Git operations failed - this is normal if not in a git repo
                // Don't spam logs, just clear files
                this.files = [];
            }
        } catch (error) {
            // Only log unexpected errors, not auth or git repo errors
            if (!(error as any)?.message?.includes('Auth session') && 
                !(error as any)?.message?.includes('not a git repository')) {
                console.error('Failed to refresh Git status:', error);
            }
        } finally {
            this.isLoadingStatus = false;
        }
    }

    /**
     * Parse Git status --porcelain output into structured file information
     */
    private async parseGitStatusOutput(output: string): Promise<GitFileStatus[]> {
        const files: GitFileStatus[] = [];
        
        if (!output.trim()) {
            return files;
        }
        
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            if (line.length < 3) continue;
            
            const indexStatus = line[0]; // Staged status
            const workTreeStatus = line[1]; // Unstaged status
            const filePath = line.substring(3);
            
            // Determine file status and staging
            let fileStatus: GitFileStatus['status'] = 'modified';
            let staged = false;
            
            // Parse git status codes according to git status --porcelain format
            if (indexStatus === 'A') {
                fileStatus = 'added';
                staged = true;
            } else if (indexStatus === 'M') {
                fileStatus = 'modified';
                staged = true;
            } else if (indexStatus === 'D') {
                fileStatus = 'deleted';
                staged = true;
            } else if (indexStatus === 'R') {
                fileStatus = 'renamed';
                staged = true;
            } else if (workTreeStatus === 'M') {
                fileStatus = 'modified';
                staged = false;
            } else if (workTreeStatus === 'D') {
                fileStatus = 'deleted';
                staged = false;
            } else if (indexStatus === '?' && workTreeStatus === '?') {
                fileStatus = 'untracked';
                staged = false;
            }
            
            files.push({
                path: filePath,
                status: fileStatus,
                staged,
                hasConflicts: line.includes('UU') || line.includes('AA'),
            });
        }
        
        return files;
    }

    /**
     * Parse Git status into structured file information (legacy method)
     */
    private async parseGitStatus(status: GitStatus): Promise<GitFileStatus[]> {
        // This is the legacy method, kept for compatibility
        const files: GitFileStatus[] = [];
        
        status.files.forEach(file => {
            files.push({
                path: file,
                status: 'modified',
                staged: false,
                hasConflicts: false,
            });
        });
        
        return files;
    }

    /**
     * Stage a specific file
     */
    async stageFile(filePath: string): Promise<boolean> {
        try {
            if (!this.isSessionReady) {
                return false;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return false;
            }
            
            const result = await activeSandbox.session.runCommand(`git add "${filePath}"`, undefined, true);
            if (result.success) {
                await this.refreshStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to stage file:', error);
            return false;
        }
    }

    /**
     * Unstage a specific file
     */
    async unstageFile(filePath: string): Promise<boolean> {
        try {
            if (!this.isSessionReady) {
                return false;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return false;
            }
            
            const result = await activeSandbox.session.runCommand(`git reset HEAD "${filePath}"`, undefined, true);
            if (result.success) {
                await this.refreshStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to unstage file:', error);
            return false;
        }
    }

    /**
     * Stage all files
     */
    async stageAll(): Promise<boolean> {
        try {
            if (!this.isSessionReady) {
                return false;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return false;
            }
            
            const result = await activeSandbox.session.runCommand('git add .', undefined, true);
            if (result.success) {
                await this.refreshStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to stage all files:', error);
            return false;
        }
    }

    /**
     * Unstage all files
     */
    async unstageAll(): Promise<boolean> {
        try {
            if (!this.isSessionReady) {
                return false;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return false;
            }
            
            const result = await activeSandbox.session.runCommand('git reset HEAD', undefined, true);
            if (result.success) {
                await this.refreshStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to unstage all files:', error);
            return false;
        }
    }

    /**
     * Create a commit with staged files
     */
    async commit(commitInfo: CommitInfo): Promise<boolean> {
        if (this.isCommitting) return false;
        
        this.isCommitting = true;
        
        try {
            // Use the existing commit functionality through VersionsManager
            const result = await this.editorEngine.versions.createCommit(commitInfo.message, false);
            
            if (result.success) {
                await this.refreshStatus();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to create commit:', error);
            return false;
        } finally {
            this.isCommitting = false;
        }
    }

    /**
     * Get file diff for a specific file
     */
    async getFileDiff(filePath: string): Promise<string | null> {
        try {
            if (!this.isSessionReady) {
                return null;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return null;
            }
            
            const result = await activeSandbox.session.runCommand(`git diff "${filePath}"`, undefined, true);
            return result.success ? result.output || null : null;
        } catch (error) {
            console.error('Failed to get file diff:', error);
            return null;
        }
    }

    /**
     * Get staged file diff
     */
    async getStagedDiff(filePath?: string): Promise<string | null> {
        try {
            if (!this.isSessionReady) {
                return null;
            }
            
            const activeSandbox = this.editorEngine.activeSandbox;
            if (!activeSandbox?.session?.provider) {
                return null;
            }
            
            const command = filePath ? `git diff --cached "${filePath}"` : 'git diff --cached';
            const result = await activeSandbox.session.runCommand(command, undefined, true);
            return result.success ? result.output || null : null;
        } catch (error) {
            console.error('Failed to get staged diff:', error);
            return null;
        }
    }

    /**
     * Set connected repository
     */
    setConnectedRepo(repo: GitRepository) {
        this.connectedRepo = repo;
    }

    /**
     * Get count of changes by type
     */
    get changeCounts() {
        const staged = this.files.filter(f => f.staged).length;
        const unstaged = this.files.filter(f => !f.staged).length;
        const total = this.files.length;
        
        return { staged, unstaged, total };
    }

    /**
     * Get files by status
     */
    get stagedFiles() {
        return this.files.filter(f => f.staged);
    }

    get unstagedFiles() {
        return this.files.filter(f => !f.staged);
    }

    get hasChanges() {
        return this.files.length > 0;
    }

    get hasStagedChanges() {
        return this.stagedFiles.length > 0;
    }

    clear() {
        // Clear all timers
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.sessionCheckTimeout) {
            clearTimeout(this.sessionCheckTimeout);
            this.sessionCheckTimeout = null;
        }
        
        // Reset state
        this.files = [];
        this.connectedRepo = null;
        this.isSessionReady = false;
        this.retryAttempts = 0;
        this.isLoadingStatus = false;
    }
}
