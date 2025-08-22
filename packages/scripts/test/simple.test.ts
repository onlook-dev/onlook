import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

// Test helper functions that don't require complex mocking
describe('basic functionality tests', () => {
    const testDir = path.join(__dirname, 'temp-simple');

    it('should be able to create and read files', () => {
        // Ensure test directory exists
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const testFile = path.join(testDir, 'test.env');
        const content = 'TEST_KEY=test_value\n';

        fs.writeFileSync(testFile, content);
        const readContent = fs.readFileSync(testFile, 'utf-8');

        expect(readContent).toBe(content);

        // Cleanup
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should correctly parse environment variable lines', () => {
        const envContent = `# Comment
KEY1=value1
KEY2=value with spaces
KEY3=https://example.com?param=value&other=data
EMPTY_KEY=
`;

        const lines = envContent.split('\n');
        const parsedVars: Record<string, string> = {};

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes('=') && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key) {
                    parsedVars[key] = valueParts.join('=');
                }
            }
        }

        expect(parsedVars.KEY1).toBe('value1');
        expect(parsedVars.KEY2).toBe('value with spaces');
        expect(parsedVars.KEY3).toBe('https://example.com?param=value&other=data');
        expect(parsedVars.EMPTY_KEY).toBe('');
        expect(parsedVars['# Comment']).toBeUndefined();
    });

    it('should generate proper env content format without descriptions', () => {
        const API_KEYS = {
            TEST_KEY1: { required: true },
            TEST_KEY2: { required: false },
        };

        const responses = {
            TEST_KEY1: 'value1',
            TEST_KEY2: 'value2',
        };

        const envContent = Object.entries(API_KEYS)
            .map(([key]) => {
                const value = responses[key] || '';
                return `${key}=${value}`;
            })
            .join('\n');

        expect(envContent).not.toContain('#'); // No comments
        expect(envContent).toContain('TEST_KEY1=value1');
        expect(envContent).toContain('TEST_KEY2=value2');
        expect(envContent.split('\n')).toHaveLength(2); // No extra lines
        expect(envContent).toBe('TEST_KEY1=value1\nTEST_KEY2=value2');
    });

    it('should validate JWT token patterns', () => {
        const jwtPattern = /^ey[A-Za-z0-9_-]{3,}$/; // JWT tokens need to be longer than just "ey"

        expect('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9').toMatch(jwtPattern);
        expect('test_jwt_like_pattern_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9').not.toMatch(
            jwtPattern,
        );
        expect('invalid-token').not.toMatch(jwtPattern);
        expect('ey').not.toMatch(jwtPattern); // Too short
        expect('').not.toMatch(jwtPattern);
    });

    it('should extract supabase keys from output', () => {
        const extractSupabaseKeys = (output: string) => {
            const anon = output.match(/anon key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);
            const role = output.match(/service_role key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);
            return anon?.[1] && role?.[1] ? { anonKey: anon[1], serviceRoleKey: role[1] } : null;
        };

        const validOutput = `
Started supabase local development setup.
anon key: eyTest_demo_anon_key_safe_placeholder_string
service_role key: eyTest_demo_service_role_key_safe_placeholder_string
        `;

        const keys = extractSupabaseKeys(validOutput);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_demo_anon_key_safe_placeholder_string');
        expect(keys?.serviceRoleKey).toBe('eyTest_demo_service_role_key_safe_placeholder_string');

        const invalidOutput = 'No keys here';
        expect(extractSupabaseKeys(invalidOutput)).toBeNull();
    });
});
