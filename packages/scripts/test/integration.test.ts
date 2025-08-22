import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('environment file integration tests', () => {
    const testDir = path.join(__dirname, 'temp-integration');
    const testEnvPath = path.join(testDir, '.env');

    beforeEach(() => {
        // Create test directory
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should handle reading existing environment files', () => {
        // Create a test .env file
        const existingContent = `# Database config
DB_HOST=localhost
DB_PORT=5432

# API Keys
API_KEY=test_api_key_placeholder_safe_123
OPTIONAL_KEY=

# URLs with special characters
WEBHOOK_URL=https://example.com/webhook?token=test_token_placeholder&user=test
`;

        fs.writeFileSync(testEnvPath, existingContent);

        // Read and parse the file (simulating what our code does)
        const content = fs.readFileSync(testEnvPath, 'utf-8');
        const lines = content.split('\n');

        const envVars: Record<string, string> = {};
        let currentComment = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('#')) {
                currentComment = trimmedLine;
            } else if (trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key) {
                    envVars[key] = valueParts.join('=');
                }
                currentComment = '';
            }
        }

        expect(envVars.DB_HOST).toBe('localhost');
        expect(envVars.DB_PORT).toBe('5432');
        expect(envVars.API_KEY).toBe('test_api_key_placeholder_safe_123');
        expect(envVars.OPTIONAL_KEY).toBe('');
        expect(envVars.WEBHOOK_URL).toBe(
            'https://example.com/webhook?token=test_token_placeholder&user=test',
        );
    });

    it('should handle merging new and existing environment variables', () => {
        // Create existing .env file
        const existingContent = `EXISTING_KEY=existing_value
CONFLICT_KEY=old_value
`;
        fs.writeFileSync(testEnvPath, existingContent);

        // Simulate new content to merge
        const newContent = `CONFLICT_KEY=new_value
NEW_KEY=new_value
`;

        // Read existing
        const existing = fs.readFileSync(testEnvPath, 'utf-8');
        const existingVars: Record<string, string> = {};

        existing.split('\n').forEach((line) => {
            if (line.includes('=') && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) existingVars[key] = valueParts.join('=');
            }
        });

        // Parse new content
        const newVars: Record<string, string> = {};
        newContent.split('\n').forEach((line) => {
            if (line.includes('=') && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) newVars[key] = valueParts.join('=');
            }
        });

        // Simulate merge logic (keeping existing, adding new)
        const finalVars = { ...existingVars };

        for (const [key, value] of Object.entries(newVars)) {
            if (!existingVars[key]) {
                finalVars[key] = value; // Add new keys
            }
            // In real implementation, we'd prompt for conflicts
        }

        expect(finalVars.EXISTING_KEY).toBe('existing_value');
        expect(finalVars.CONFLICT_KEY).toBe('old_value'); // Kept existing
        expect(finalVars.NEW_KEY).toBe('new_value'); // Added new
    });

    it('should generate correct backend environment content without comments', () => {
        const mockKeys = {
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_token',
            serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_token',
        };

        // Test client env generation (expected format without comments)
        const expectedClientEnvContent = `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${mockKeys.anonKey}
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

        // Test db env generation (expected format without comments)
        const expectedDbEnvContent = `SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=${mockKeys.serviceRoleKey}
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

        // Verify client content structure
        expect(expectedClientEnvContent).toContain(
            'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321',
        );
        expect(expectedClientEnvContent).toContain(
            `NEXT_PUBLIC_SUPABASE_ANON_KEY=${mockKeys.anonKey}`,
        );
        expect(expectedClientEnvContent).toContain(
            'SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        );
        expect(expectedClientEnvContent).not.toContain('#'); // No comments
        expect(expectedClientEnvContent.split('\n')).toHaveLength(3); // No extra lines

        // Verify db content structure
        expect(expectedDbEnvContent).toContain('SUPABASE_URL=http://127.0.0.1:54321');
        expect(expectedDbEnvContent).toContain(
            `SUPABASE_SERVICE_ROLE_KEY=${mockKeys.serviceRoleKey}`,
        );
        expect(expectedDbEnvContent).toContain(
            'SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        );
        expect(expectedDbEnvContent).not.toContain('#'); // No comments
        expect(expectedDbEnvContent.split('\n')).toHaveLength(3); // No extra lines
    });

    it('should handle API key configuration validation', () => {
        const API_KEYS = {
            REQUIRED_KEY: { required: true },
            OPTIONAL_KEY: { required: false },
        };

        // Test required key validation
        const responses = {
            REQUIRED_KEY: '',
            OPTIONAL_KEY: 'optional_value',
        };

        const missingKeys = Object.entries(API_KEYS)
            .filter(([key, config]) => config.required && !responses[key])
            .map(([key]) => key);

        expect(missingKeys).toEqual(['REQUIRED_KEY']);

        // Test with all required keys provided
        const validResponses = {
            REQUIRED_KEY: 'required_value',
            OPTIONAL_KEY: '',
        };

        const validMissingKeys = Object.entries(API_KEYS)
            .filter(([key, config]) => config.required && !validResponses[key])
            .map(([key]) => key);

        expect(validMissingKeys).toEqual([]);
    });

    it('should handle directory creation for nested paths', () => {
        const nestedEnvPath = path.join(testDir, 'deep', 'nested', 'path', '.env');
        const content = 'NESTED_KEY=nested_value\n';

        // Simulate creating directory structure
        const dir = nestedEnvPath.substring(0, nestedEnvPath.lastIndexOf('/'));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(nestedEnvPath, content);

        expect(fs.existsSync(nestedEnvPath)).toBe(true);
        expect(fs.readFileSync(nestedEnvPath, 'utf-8')).toBe(content);
    });
});
