/**
 * Figma API Client with rate limiting and error handling
 */
export class FigmaApiClient {
    private baseUrl = 'https://api.figma.com/v1';
    private accessToken: string;
    private requestQueue: Array<() => Promise<any>> = [];
    private isProcessing = false;
    private lastRequestTime = 0;
    private minRequestInterval = 100; // 100ms between requests (10 req/sec)

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Make a rate-limited request to Figma API
     */
    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const result = await this.makeRequest<T>(endpoint, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process request queue with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.requestQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;

        // Wait for rate limit if needed
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            await this.sleep(this.minRequestInterval - timeSinceLastRequest);
        }

        const request = this.requestQueue.shift();
        if (request) {
            this.lastRequestTime = Date.now();
            await request();
        }

        // Process next request
        this.processQueue();
    }

    /**
     * Make actual HTTP request to Figma API
     */
    private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        // Handle rate limiting
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60s
            
            await this.sleep(waitTime);
            return this.makeRequest<T>(endpoint, options); // Retry
        }

        // Handle errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new FigmaApiError(
                `Figma API error: ${response.statusText}`,
                response.status,
                errorText
            );
        }

        return response.json();
    }

    /**
     * Get file data
     */
    async getFile(fileId: string): Promise<any> {
        return this.request(`/files/${fileId}`);
    }

    /**
     * Get file nodes
     */
    async getFileNodes(fileId: string, nodeIds: string[]): Promise<any> {
        const ids = nodeIds.join(',');
        return this.request(`/files/${fileId}/nodes?ids=${ids}`);
    }

    /**
     * Get file images
     */
    async getFileImages(fileId: string, nodeIds: string[], format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png'): Promise<any> {
        const ids = nodeIds.join(',');
        return this.request(`/images/${fileId}?ids=${ids}&format=${format}`);
    }

    /**
     * Get file styles
     */
    async getFileStyles(fileId: string): Promise<any> {
        return this.request(`/files/${fileId}/styles`);
    }

    /**
     * Get file components
     */
    async getFileComponents(fileId: string): Promise<any> {
        return this.request(`/files/${fileId}/components`);
    }

    /**
     * Get file comments
     */
    async getFileComments(fileId: string): Promise<any> {
        return this.request(`/files/${fileId}/comments`);
    }

    /**
     * Get current user info
     */
    async getMe(): Promise<any> {
        return this.request('/me');
    }

    /**
     * Get team projects
     */
    async getTeamProjects(teamId: string): Promise<any> {
        return this.request(`/teams/${teamId}/projects`);
    }

    /**
     * Get project files
     */
    async getProjectFiles(projectId: string): Promise<any> {
        return this.request(`/projects/${projectId}/files`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Custom error class for Figma API errors
 */
export class FigmaApiError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public responseBody: string
    ) {
        super(message);
        this.name = 'FigmaApiError';
    }
}

/**
 * Error types
 */
export enum FigmaErrorType {
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Parse Figma API error
 */
export function parseFigmaError(error: any): { type: FigmaErrorType; message: string } {
    if (error instanceof FigmaApiError) {
        switch (error.statusCode) {
            case 401:
            case 403:
                return {
                    type: FigmaErrorType.AUTHENTICATION_FAILED,
                    message: 'Authentication failed. Please check your access token.',
                };
            case 404:
                return {
                    type: FigmaErrorType.FILE_NOT_FOUND,
                    message: 'File not found. Please check the file ID.',
                };
            case 429:
                return {
                    type: FigmaErrorType.RATE_LIMIT_EXCEEDED,
                    message: 'Rate limit exceeded. Please try again later.',
                };
            case 400:
                return {
                    type: FigmaErrorType.INVALID_REQUEST,
                    message: 'Invalid request. Please check your parameters.',
                };
            default:
                return {
                    type: FigmaErrorType.UNKNOWN_ERROR,
                    message: error.message,
                };
        }
    }

    if (error.message?.includes('fetch')) {
        return {
            type: FigmaErrorType.NETWORK_ERROR,
            message: 'Network error. Please check your connection.',
        };
    }

    return {
        type: FigmaErrorType.UNKNOWN_ERROR,
        message: error.message || 'An unknown error occurred.',
    };
}