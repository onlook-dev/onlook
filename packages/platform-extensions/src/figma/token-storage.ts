import type { FigmaAuth } from './types';

/**
 * Secure token storage for Figma authentication
 */
export class FigmaTokenStorage {
    private static readonly STORAGE_KEY = 'figma_auth';
    private static readonly ENCRYPTION_KEY = 'onlook_figma_key'; // In production, use proper encryption

    /**
     * Store Figma authentication data securely
     */
    static async store(auth: FigmaAuth, userId: string): Promise<void> {
        try {
            const data = {
                ...auth,
                userId,
                storedAt: new Date().toISOString(),
            };

            // In a real implementation, encrypt the data before storing
            const encrypted = this.encrypt(JSON.stringify(data));
            
            // Store in secure storage (database, keychain, etc.)
            // For now, we'll use a simple in-memory storage
            this.memoryStorage.set(`${this.STORAGE_KEY}_${userId}`, encrypted);
        } catch (error) {
            throw new Error(`Failed to store Figma auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieve Figma authentication data
     */
    static async retrieve(userId: string): Promise<FigmaAuth | null> {
        try {
            const encrypted = this.memoryStorage.get(`${this.STORAGE_KEY}_${userId}`);
            if (!encrypted) {
                return null;
            }

            const decrypted = this.decrypt(encrypted);
            const data = JSON.parse(decrypted);

            // Check if token is expired
            if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
                await this.remove(userId);
                return null;
            }

            return {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            };
        } catch (error) {
            throw new Error(`Failed to retrieve Figma auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Remove stored authentication data
     */
    static async remove(userId: string): Promise<void> {
        try {
            this.memoryStorage.delete(`${this.STORAGE_KEY}_${userId}`);
        } catch (error) {
            throw new Error(`Failed to remove Figma auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if user has stored authentication
     */
    static async hasAuth(userId: string): Promise<boolean> {
        return this.memoryStorage.has(`${this.STORAGE_KEY}_${userId}`);
    }

    /**
     * Update stored authentication data
     */
    static async update(auth: FigmaAuth, userId: string): Promise<void> {
        await this.store(auth, userId);
    }

    // Simple in-memory storage for demo purposes
    // In production, use proper database storage
    private static memoryStorage = new Map<string, string>();

    /**
     * Simple encryption (for demo purposes)
     * In production, use proper encryption like AES
     */
    private static encrypt(data: string): string {
        // This is a very basic encoding, not real encryption
        // In production, use proper encryption libraries
        return Buffer.from(data).toString('base64');
    }

    /**
     * Simple decryption (for demo purposes)
     */
    private static decrypt(encrypted: string): string {
        // This is a very basic decoding, not real decryption
        return Buffer.from(encrypted, 'base64').toString('utf-8');
    }
}

// TODO: Implement persistent token storage backed by the primary database once schema & infra are ready.
export class DatabaseTokenStorage {
    static async store(auth: FigmaAuth, userId: string, projectId?: string): Promise<void> {
        throw new Error('Database storage not implemented yet');
    }

    static async retrieve(userId: string, projectId?: string): Promise<FigmaAuth | null> {
        throw new Error('Database storage not implemented yet');
    }

    static async remove(userId: string, projectId?: string): Promise<void> {
        throw new Error('Database storage not implemented yet');
    }
}