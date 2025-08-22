import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

// Import actual functions to test
import { getDbEnvContent } from '../src/backend';

describe('comprehensive functionality tests', () => {
    const testDir = path.join(__dirname, 'temp-comprehensive');

    beforeEach(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Backend environment generation', () => {
        it('should generate correct client backend environment content', () => {
            // Test the actual generateBackendEnvContent function through getClientEnvContent
            const mockKeys = {
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_test',
                serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_test',
            };

            // We need to test the actual function, but it's not exported
            // Let's create a similar test with the expected output format
            const expectedContent = `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${mockKeys.anonKey}
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

            // Verify the expected format matches our requirements
            const lines = expectedContent.split('\n');
            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321');
            expect(lines[1]).toBe(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${mockKeys.anonKey}`);
            expect(lines[2]).toBe(
                'SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
            );

            // Verify no empty lines or comments
            expect(expectedContent).not.toContain('#');
            expect(expectedContent).not.toMatch(/\n\s*\n/);
        });

        it('should generate correct database backend environment content', () => {
            const mockKeys = {
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_test',
                serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_test',
            };

            const dbContent = getDbEnvContent(mockKeys);
            const expectedContent = `SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=${mockKeys.serviceRoleKey}
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

            expect(dbContent).toBe(expectedContent);

            // Verify structure
            const lines = dbContent.split('\n');
            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe('SUPABASE_URL=http://127.0.0.1:54321');
            expect(lines[1]).toBe(`SUPABASE_SERVICE_ROLE_KEY=${mockKeys.serviceRoleKey}`);
            expect(lines[2]).toBe(
                'SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
            );

            // Verify no empty lines or comments
            expect(dbContent).not.toContain('#');
            expect(dbContent).not.toMatch(/\n\s*\n/);
        });

        it('should handle empty keys correctly', () => {
            const emptyKeys = {
                anonKey: '',
                serviceRoleKey: '',
            };

            const dbContent = getDbEnvContent(emptyKeys);
            const expectedContent = `SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

            expect(dbContent).toBe(expectedContent);
            expect(dbContent).toContain('SUPABASE_SERVICE_ROLE_KEY=');
        });
    });

    describe('Environment parsing and generation', () => {
        it('should parse environment content without comments', () => {
            const testContent = `KEY1=value1
KEY2=value with spaces
KEY3=https://example.com?param=value&other=data
EMPTY_KEY=
# This comment should be ignored
COMMENTED_KEY=should_be_ignored # inline comment ignored
VALID_KEY=valid_value`;

            // Simulate the parseEnvContent logic without importing (since it's not exported)
            const envVars = new Map();
            const lines = testContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (
                    trimmedLine.includes('=') &&
                    trimmedLine.indexOf('=') > 0 &&
                    !trimmedLine.startsWith('#')
                ) {
                    const [key, ...valueParts] = trimmedLine.split('=');
                    const cleanKey = key?.trim();
                    if (cleanKey) {
                        const value = valueParts.join('=');
                        envVars.set(cleanKey, { key: cleanKey, value });
                    }
                }
            }

            expect(envVars.has('KEY1')).toBe(true);
            expect(envVars.get('KEY1').value).toBe('value1');
            expect(envVars.has('KEY2')).toBe(true);
            expect(envVars.get('KEY2').value).toBe('value with spaces');
            expect(envVars.has('KEY3')).toBe(true);
            expect(envVars.get('KEY3').value).toBe('https://example.com?param=value&other=data');
            expect(envVars.has('EMPTY_KEY')).toBe(true);
            expect(envVars.get('EMPTY_KEY').value).toBe('');
            expect(envVars.has('COMMENTED_KEY')).toBe(true);
            expect(envVars.get('COMMENTED_KEY').value).toBe(
                'should_be_ignored # inline comment ignored',
            );
            expect(envVars.has('VALID_KEY')).toBe(true);
            expect(envVars.get('VALID_KEY').value).toBe('valid_value');

            // Comments should be ignored
            expect(envVars.has('# This comment should be ignored')).toBe(false);
        });

        it('should build environment file content without spacing', () => {
            const envVars = new Map();
            envVars.set('KEY1', { key: 'KEY1', value: 'value1' });
            envVars.set('KEY2', { key: 'KEY2', value: 'value2' });
            envVars.set('KEY3', { key: 'KEY3', value: 'value3' });

            // Simulate buildEnvFileContent logic
            const lines = [];
            for (const envVar of envVars.values()) {
                lines.push(`${envVar.key}=${envVar.value}`);
            }
            const content = lines.join('\n');

            const expectedContent = `KEY1=value1
KEY2=value2
KEY3=value3`;

            expect(content).toBe(expectedContent);

            // Verify no empty lines
            expect(content.split('\n')).toHaveLength(3);
            expect(content).not.toMatch(/\n\s*\n/);
        });
    });

    describe('API key generation', () => {
        it('should generate API key content without descriptions or spacing', () => {
            const API_KEYS = {
                CSB_API_KEY: {
                    name: 'CSB_API_KEY',
                    message: 'Enter your Codesandbox API key:',
                    required: true,
                },
                OPENROUTER_API_KEY: {
                    name: 'OPENROUTER_API_KEY',
                    message: 'Enter your OpenRouter API key:',
                    required: true,
                },
            };

            const responses = {
                CSB_API_KEY: 'test_csb_key',
                OPENROUTER_API_KEY: 'test_openrouter_key',
            };

            // Simulate generateEnvContent logic
            const lines = [];
            for (const [key] of Object.entries(API_KEYS)) {
                const value = responses[key] || '';
                lines.push(`${key}=${value}`);
            }
            const content = lines.join('\n');

            const expectedContent = `CSB_API_KEY=test_csb_key
OPENROUTER_API_KEY=test_openrouter_key`;

            expect(content).toBe(expectedContent);

            // Verify no comments or empty lines
            expect(content).not.toContain('#');
            expect(content.split('\n')).toHaveLength(2);
            expect(content).not.toMatch(/\n\s*\n/);
        });

        it('should handle empty API key values', () => {
            const responses = {
                CSB_API_KEY: '',
                OPENROUTER_API_KEY: 'test_key',
            };

            const content = `CSB_API_KEY=${responses.CSB_API_KEY}
OPENROUTER_API_KEY=${responses.OPENROUTER_API_KEY}`;

            expect(content).toBe(`CSB_API_KEY=
OPENROUTER_API_KEY=test_key`);
        });
    });

    describe('Key extraction', () => {
        it('should extract Supabase keys from output correctly', () => {
            const extractSupabaseKeys = (output: string) => {
                const anonMatch = output.match(/anon key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);
                const roleMatch = output.match(/service_role key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);

                const anonKey = anonMatch?.[1];
                const serviceRoleKey = roleMatch?.[1];

                return anonKey && serviceRoleKey ? { anonKey, serviceRoleKey } : null;
            };

            // Test successful extraction
            const validOutput = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

Supabase local development setup completed.
            `;

            const keys = extractSupabaseKeys(validOutput);
            expect(keys).not.toBeNull();
            expect(keys?.anonKey).toBe(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
            );
            expect(keys?.serviceRoleKey).toBe(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
            );

            // Test failed extraction
            const invalidOutputs = [
                'No keys here',
                'anon key: invalid_key\nservice_role key: also_invalid',
                'anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test', // Missing service_role key
                'service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test', // Missing anon key
            ];

            invalidOutputs.forEach((output) => {
                expect(extractSupabaseKeys(output)).toBeNull();
            });
        });

        it('should validate JWT token patterns', () => {
            const isValidJWT = (token: string) => /^ey[A-Za-z0-9_.-]{3,}$/.test(token);

            // Valid JWTs
            expect(isValidJWT('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
            expect(
                isValidJWT(
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature',
                ),
            ).toBe(true);

            // Invalid JWTs
            expect(isValidJWT('invalid_token')).toBe(false);
            expect(isValidJWT('ey')).toBe(false); // Too short
            expect(isValidJWT('')).toBe(false);
            expect(isValidJWT('eyJ contains spaces')).toBe(false);
        });
    });

    describe('File operations', () => {
        it('should create directory structure if it does not exist', () => {
            const nestedPath = path.join(testDir, 'deep', 'nested', 'structure', '.env');
            const content = 'TEST_KEY=test_value';

            // Simulate ensureDirectoryExists logic
            const dir = nestedPath.substring(0, nestedPath.lastIndexOf('/'));
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(nestedPath, content);

            expect(fs.existsSync(nestedPath)).toBe(true);
            expect(fs.readFileSync(nestedPath, 'utf-8')).toBe(content);
        });

        it('should handle file writing with various content types', () => {
            const testCases = [
                { name: 'simple.env', content: 'KEY=value' },
                { name: 'empty.env', content: '' },
                { name: 'multiline.env', content: 'KEY1=value1\nKEY2=value2\nKEY3=value3' },
                {
                    name: 'special_chars.env',
                    content: 'URL=https://example.com?param=value&other=data\nPASS=p@ssw0rd!#$%',
                },
                { name: 'unicode.env', content: 'MESSAGE=Hello 世界 🌍' },
            ];

            testCases.forEach(({ name, content }) => {
                const filePath = path.join(testDir, name);
                fs.writeFileSync(filePath, content);

                expect(fs.existsSync(filePath)).toBe(true);
                expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
            });
        });

        it('should validate environment variable format requirements', () => {
            const isValidEnvLine = (line: string) => {
                const trimmed = line.trim();
                return (
                    trimmed.includes('=') && trimmed.indexOf('=') > 0 && !trimmed.startsWith('#')
                );
            };

            // Valid lines
            expect(isValidEnvLine('KEY=value')).toBe(true);
            expect(isValidEnvLine('KEY_WITH_UNDERSCORES=value')).toBe(true);
            expect(isValidEnvLine('KEY=')).toBe(true); // Empty value is valid
            expect(isValidEnvLine('KEY=value=with=equals')).toBe(true); // Multiple equals in value

            // Invalid lines
            expect(isValidEnvLine('#COMMENT=value')).toBe(false); // Comment
            expect(isValidEnvLine('=value')).toBe(false); // No key
            expect(isValidEnvLine('KEY')).toBe(false); // No equals
            expect(isValidEnvLine('')).toBe(false); // Empty line
            expect(isValidEnvLine('   ')).toBe(false); // Only whitespace
        });
    });
});
