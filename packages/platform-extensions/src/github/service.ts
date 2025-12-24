import type { Branch, PullRequest, Commit, RepositoryState, CodeChange, GitHubAuth } from './types';

export class GitHubIntegrationService {
    private accessToken?: string;
    private baseUrl = 'https://api.github.com';

    /**
     * Authenticate with GitHub using personal access token or OAuth token
     */
    async authenticate(token: string): Promise<GitHubAuth> {
        this.accessToken = token;
        
        // Validate token by making a test request
        try {
            const response = await this.makeRequest('/user');
            return {
                accessToken: token,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for PAT
            };
        } catch (error) {
            throw new Error(`GitHub authentication failed: ${error}`);
        }
    }

    /**
     * List accessible repositories
     */
    async listRepositories(): Promise<any[]> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const response = await this.makeRequest('/user/repos?sort=updated&per_page=100');
            return response;
        } catch (error) {
            throw new Error(`Failed to list repositories: ${error}`);
        }
    }

    /**
     * Get repository information
     */
    async getRepository(owner: string, repo: string): Promise<any> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            return await this.makeRequest(`/repos/${owner}/${repo}`);
        } catch (error) {
            throw new Error(`Failed to get repository: ${error}`);
        }
    }

    /**
     * Check repository access permissions
     */
    async checkRepositoryAccess(owner: string, repo: string): Promise<boolean> {
        try {
            await this.getRepository(owner, repo);
            return true;
        } catch {
            return false;
        }
    }

    async createBranch(repo: string, branchName: string): Promise<Branch> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const [owner, repoName] = repo.split('/');
            
            // Get the default branch SHA
            const repoInfo = await this.getRepository(owner, repoName);
            const defaultBranch = repoInfo.default_branch;
            const defaultBranchInfo = await this.makeRequest(`/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`);
            const sha = defaultBranchInfo.object.sha;

            // Create new branch
            const response = await this.makeRequest(`/repos/${owner}/${repoName}/git/refs`, {
                method: 'POST',
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: sha,
                }),
            });

            return {
                name: branchName,
                sha: response.object.sha,
                url: response.url,
            };
        } catch (error) {
            throw new Error(`Failed to create branch: ${error}`);
        }
    }

    async createPullRequest(
        repo: string,
        branch: string,
        changes: CodeChange[]
    ): Promise<PullRequest> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const [owner, repoName] = repo.split('/');
            
            // First commit the changes
            const commit = await this.commitChanges(repo, branch, changes);
            
            // Create pull request
            const title = `Onlook Platform Extensions Update`;
            const body = this.generatePRDescription(changes);
            
            const response = await this.makeRequest(`/repos/${owner}/${repoName}/pulls`, {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    body,
                    head: branch,
                    base: 'main', // or master
                }),
            });

            return {
                id: response.id.toString(),
                number: response.number,
                title: response.title,
                description: response.body,
                branch: branch,
                baseBranch: response.base.ref,
                status: 'open',
                url: response.html_url,
            };
        } catch (error) {
            throw new Error(`Failed to create pull request: ${error}`);
        }
    }

    async commitChanges(
        repo: string,
        branch: string,
        changes: CodeChange[]
    ): Promise<Commit> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const [owner, repoName] = repo.split('/');
            
            // Get the latest commit SHA for the branch
            const branchInfo = await this.makeRequest(`/repos/${owner}/${repoName}/git/refs/heads/${branch}`);
            const latestCommitSha = branchInfo.object.sha;
            
            // Get the tree SHA from the latest commit
            const latestCommit = await this.makeRequest(`/repos/${owner}/${repoName}/git/commits/${latestCommitSha}`);
            const baseTreeSha = latestCommit.tree.sha;
            
            // Create blobs for each file change
            const tree = [];
            for (const change of changes) {
                if (change.operation === 'delete') {
                    tree.push({
                        path: change.filePath,
                        mode: '100644',
                        type: 'blob',
                        sha: null, // null SHA means delete
                    });
                } else {
                    // Create blob for file content
                    const blobResponse = await this.makeRequest(`/repos/${owner}/${repoName}/git/blobs`, {
                        method: 'POST',
                        body: JSON.stringify({
                            content: change.content,
                            encoding: 'utf-8',
                        }),
                    });
                    
                    tree.push({
                        path: change.filePath,
                        mode: '100644',
                        type: 'blob',
                        sha: blobResponse.sha,
                    });
                }
            }
            
            // Create new tree
            const treeResponse = await this.makeRequest(`/repos/${owner}/${repoName}/git/trees`, {
                method: 'POST',
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: tree,
                }),
            });
            
            // Create commit
            const commitMessage = this.generateCommitMessage(changes);
            const commitResponse = await this.makeRequest(`/repos/${owner}/${repoName}/git/commits`, {
                method: 'POST',
                body: JSON.stringify({
                    message: commitMessage,
                    tree: treeResponse.sha,
                    parents: [latestCommitSha],
                }),
            });
            
            // Update branch reference
            await this.makeRequest(`/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    sha: commitResponse.sha,
                }),
            });

            return {
                sha: commitResponse.sha,
                message: commitMessage,
                url: commitResponse.html_url,
            };
        } catch (error) {
            throw new Error(`Failed to commit changes: ${error}`);
        }
    }

    async syncRepository(repo: string): Promise<RepositoryState> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const [owner, repoName] = repo.split('/');
            
            // Get branches
            const branchesResponse = await this.makeRequest(`/repos/${owner}/${repoName}/branches`);
            const branches = branchesResponse.map((branch: any) => ({
                name: branch.name,
                sha: branch.commit.sha,
                url: branch.commit.url,
            }));
            
            // Get latest commit
            const commitsResponse = await this.makeRequest(`/repos/${owner}/${repoName}/commits?per_page=1`);
            const lastCommit = commitsResponse[0];

            return {
                branches,
                lastCommit: {
                    sha: lastCommit.sha,
                    message: lastCommit.commit.message,
                    url: lastCommit.html_url,
                },
                status: 'synced',
            };
        } catch (error) {
            throw new Error(`Failed to sync repository: ${error}`);
        }
    }

    /**
     * Make authenticated request to GitHub API
     */
    private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Generate commit message from changes
     */
    private generateCommitMessage(changes: CodeChange[]): string {
        const fileCount = changes.length;
        const operations = changes.map(c => c.operation);
        const hasCreates = operations.includes('create');
        const hasUpdates = operations.includes('update');
        const hasDeletes = operations.includes('delete');

        let message = 'feat: Onlook platform extensions - ';
        
        if (hasCreates && hasUpdates && hasDeletes) {
            message += `update ${fileCount} files`;
        } else if (hasCreates && hasUpdates) {
            message += `add and update ${fileCount} files`;
        } else if (hasCreates) {
            message += `add ${fileCount} new files`;
        } else if (hasUpdates) {
            message += `update ${fileCount} files`;
        } else if (hasDeletes) {
            message += `remove ${fileCount} files`;
        }

        return message;
    }

    /**
     * Generate PR description from changes
     */
    private generatePRDescription(changes: CodeChange[]): string {
        const fileList = changes.map(change => {
            const operation = change.operation === 'create' ? '➕' : 
                            change.operation === 'update' ? '✏️' : '❌';
            return `${operation} \`${change.filePath}\``;
        }).join('\n');

        return `## Onlook Platform Extensions

This PR contains updates from Onlook's platform extensions feature.

### Changes Made:
${fileList}

### Summary:
- ${changes.length} files modified
- Generated automatically by Onlook platform extensions

---
*This PR was created automatically by Onlook. Please review the changes before merging.*`;
    }
}