import type { FigmaAuth } from './types';

/**
 * Figma API client with rate limiting and error handling
 */
export class FigmaApiClient {
    private accessToken: string;
    private baseUrl = 'https://api.figma.com/v1';
    private rateLimitDelay = 1000; // 1 second between requests
    private lastRequestTime = 0;

    constructor(auth: FigmaAuth) {
        this.accessToken = auth.accessToken;
    }

    /**
     * Make authenticated request to Figma API
     */
    private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();

        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited, wait and retry
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(endpoint, options);
            }
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get file information
     */
    async getFile(fileId: string): Promise<any> {
        return this.makeRequest(`/files/${fileId}`);
    }

    /**
     * Get file nodes
     */
    async getFileNodes(fileId: string, nodeIds: string[]): Promise<any> {
        const ids = nodeIds.join(',');
        return this.makeRequest(`/files/${fileId}/nodes?ids=${ids}`);
    }

    /**
     * Get file images
     */
    async getFileImages(fileId: string, nodeIds: string[], format: string = 'png', scale: number = 1): Promise<any> {
        const ids = nodeIds.join(',');
        const params = new URLSearchParams({
            ids,
            format,
            scale: scale.toString(),
        });
        return this.makeRequest(`/files/${fileId}/images?${params.toString()}`);
    }

    /**
     * Get file components
     */
    async getFileComponents(fileId: string): Promise<any> {
        return this.makeRequest(`/files/${fileId}/components`);
    }

    /**
     * Get file styles
     */
    async getFileStyles(fileId: string): Promise<any> {
        return this.makeRequest(`/files/${fileId}/styles`);
    }

    /**
     * Get team projects
     */
    async getTeamProjects(teamId: string): Promise<any> {
        return this.makeRequest(`/teams/${teamId}/projects`);
    }

    /**
     * Get project files
     */
    async getProjectFiles(projectId: string): Promise<any> {
        return this.makeRequest(`/projects/${projectId}/files`);
    }

    /**
     * Get user information
     */
    async getUser(): Promise<any> {
        return this.makeRequest('/me');
    }

    /**
     * Get file version history
     */
    async getFileVersions(fileId: string): Promise<any> {
        return this.makeRequest(`/files/${fileId}/versions`);
    }

    /**
     * Get comments on a file
     */
    async getFileComments(fileId: string): Promise<any> {
        return this.makeRequest(`/files/${fileId}/comments`);
    }

    /**
     * Post a comment on a file
     */
    async postComment(fileId: string, message: string, clientMeta?: any): Promise<any> {
        return this.makeRequest(`/files/${fileId}/comments`, {
            method: 'POST',
            body: JSON.stringify({
                message,
                client_meta: clientMeta,
            }),
        });
    }

    /**
     * Update access token
     */
    updateToken(auth: FigmaAuth): void {
        this.accessToken = auth.accessToken;
    }
}