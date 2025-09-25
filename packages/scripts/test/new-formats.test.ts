import { describe, it, expect } from 'bun:test';
import { extractSupabaseKeys } from '../src/backend';

describe('Supabase key extraction - new formats', () => {
    it('should extract keys using original format (backward compatibility)', () => {
        const output = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyTest_original_format_anon_key_123
service_role key: eyTest_original_format_service_key_456

Supabase local development setup completed.
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_original_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_original_format_service_key_456');
    });

    it('should extract keys using underscore format', () => {
        const output = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon_key: eyTest_underscore_format_anon_key_123
service_role_key: eyTest_underscore_format_service_key_456

Supabase local development setup completed.
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_underscore_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_underscore_format_service_key_456');
    });

    it('should extract keys using full word format', () => {
        const output = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
   anonymous key: eyTest_full_word_format_anon_key_123
service role key: eyTest_full_word_format_service_key_456

Supabase local development setup completed.
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_full_word_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_full_word_format_service_key_456');
    });

    it('should extract keys using table format', () => {
        const output = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long

Keys:
        anon | eyTest_table_format_anon_key_123
service_role | eyTest_table_format_service_key_456

Supabase local development setup completed.
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_table_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_table_format_service_key_456');
    });

    it('should extract keys using JSON format', () => {
        const output = `
Starting Supabase local development setup...

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long

{"anon_key": "eyTest_json_format_anon_key_123", "service_role_key": "eyTest_json_format_service_key_456"}

Supabase local development setup completed.
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_json_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_json_format_service_key_456');
    });

    it('should handle case insensitive matching', () => {
        const output = `
Starting Supabase local development setup...
        ANON_KEY: eyTest_case_insensitive_anon_key_123
SERVICE_ROLE_KEY: eyTest_case_insensitive_service_key_456
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_case_insensitive_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_case_insensitive_service_key_456');
    });

    it('should handle extra whitespace around keys', () => {
        const output = `
Starting Supabase local development setup...
        anon key:    eyTest_whitespace_anon_key_123   
service_role key:  eyTest_whitespace_service_key_456  
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_whitespace_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_whitespace_service_key_456');
    });

    it('should return null when keys are not found', () => {
        const output = `
Starting Supabase local development setup...
No keys here, just some random output
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).toBeNull();
    });

    it('should return null when only one key is found', () => {
        const output1 = `
Starting Supabase local development setup...
        anon key: eyTest_only_anon_key_123
        `;

        const output2 = `
Starting Supabase local development setup...
service_role key: eyTest_only_service_key_456
        `;

        expect(extractSupabaseKeys(output1)).toBeNull();
        expect(extractSupabaseKeys(output2)).toBeNull();
    });

    it('should handle mixed formats in the same output', () => {
        const output = `
Starting Supabase local development setup...
        anon key: eyTest_mixed_format_anon_key_123
service_role_key: eyTest_mixed_format_service_key_456
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toBe('eyTest_mixed_format_anon_key_123');
        expect(keys?.serviceRoleKey).toBe('eyTest_mixed_format_service_key_456');
    });

    it('should handle keys with special characters in JWT payload', () => {
        const output = `
Starting Supabase local development setup...
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk5ODYyNDAwLCJleHAiOjIwMTU0Mzg0MDB9.signature
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTk4NjI0MDAsImV4cCI6MjAxNTQzODQwMH0.signature
        `;

        const keys = extractSupabaseKeys(output);
        expect(keys).not.toBeNull();
        expect(keys?.anonKey).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        expect(keys?.serviceRoleKey).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
});