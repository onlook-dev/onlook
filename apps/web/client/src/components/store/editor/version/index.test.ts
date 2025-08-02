import { describe, expect, it, beforeEach, afterEach, jest } from 'bun:test';

// Mock the git manager and other dependencies
const mockGitManager = {
    listCommits: jest.fn(),
    getCommitNote: jest.fn(),
    isRepoInitialized: jest.fn(),
    initRepo: jest.fn(),
};

const mockEditorEngine = {
    posthog: {
        capture: jest.fn(),
    },
};

// Mock the GitManager constructor
jest.mock('./git', () => ({
    GitManager: jest.fn().mockImplementation(() => mockGitManager),
}));

// Mock the toast
jest.mock('@onlook/ui/sonner', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
        warning: jest.fn(),
    },
}));

// Mock sanitizeCommitMessage
jest.mock('@/utils/git', () => ({
    sanitizeCommitMessage: jest.fn((msg) => msg),
}));

import { VersionsManager } from './index';

describe('VersionsManager listCommits improvements', () => {
    let versionsManager: VersionsManager;
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create new instance
        versionsManager = new VersionsManager(mockEditorEngine as any);
        
        // Mock git responses
        mockGitManager.listCommits.mockResolvedValue([
            {
                oid: 'abc123',
                message: 'Test commit',
                author: { name: 'Test', email: 'test@example.com' },
                timestamp: Date.now(),
                displayName: 'Test commit',
            },
        ]);
        
        mockGitManager.getCommitNote.mockResolvedValue(null);
    });
    
    afterEach(() => {
        versionsManager.dispose();
    });

    it('should cache results and not call git multiple times within TTL', async () => {
        // First call
        const result1 = await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(1);
        
        // Second call should use cache
        const result2 = await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(1);
        
        // Results should be identical
        expect(result1).toEqual(result2);
    });

    it('should force refresh when requested', async () => {
        // First call
        await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(1);
        
        // Force refresh should call git again
        await versionsManager.listCommits(true);
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent calls correctly', async () => {
        // Start multiple concurrent calls
        const promises = [
            versionsManager.listCommits(),
            versionsManager.listCommits(),
            versionsManager.listCommits(),
        ];
        
        // Wait for all to complete
        const results = await Promise.all(promises);
        
        // Should only call git once despite multiple concurrent calls
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(1);
        
        // All results should be identical
        expect(results[0]).toEqual(results[1]);
        expect(results[1]).toEqual(results[2]);
    });

    it('should invalidate cache properly', async () => {
        // First call to populate cache
        await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(1);
        
        // Invalidate cache
        versionsManager.invalidateCommitsCache();
        
        // Next call should hit git again
        await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(2);
    });

    it('should handle debounced calls', async () => {
        // Multiple rapid debounced calls
        const promise1 = versionsManager.listCommitsDebounced();
        const promise2 = versionsManager.listCommitsDebounced();
        const promise3 = versionsManager.listCommitsDebounced();
        
        // Wait for debounce to complete
        const results = await Promise.all([promise1, promise2, promise3]);
        
        // Should eventually call git (after debounce timer + cache logic)
        // All results should be identical
        expect(results[0]).toEqual(results[1]);
        expect(results[1]).toEqual(results[2]);
    });

    it('should reset cache on error', async () => {
        // Mock git to fail once, then succeed
        mockGitManager.listCommits
            .mockRejectedValueOnce(new Error('Git failed'))
            .mockResolvedValueOnce([]);
        
        // First call should fail and reset cache
        await expect(versionsManager.listCommits()).rejects.toThrow('Git failed');
        
        // Second call should try again (not use cached error state)
        const result = await versionsManager.listCommits();
        expect(mockGitManager.listCommits).toHaveBeenCalledTimes(2);
        expect(result).toEqual([]);
    });
});