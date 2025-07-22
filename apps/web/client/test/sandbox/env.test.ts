import { describe, expect, test } from 'bun:test';
import { parseEnvContent } from '../../src/server/api/routers/publish/helpers/env';

describe('parseEnvContent', () => {
    test('should parse basic key-value pairs', () => {
        const content = `
API_KEY=abc123
DATABASE_URL=postgres://localhost:5432/db
PORT=3000
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db',
            PORT: '3000'
        });
    });

    test('should ignore comment lines', () => {
        const content = `
# This is a comment
API_KEY=abc123
# Another comment
DATABASE_URL=postgres://localhost:5432/db
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db'
        });
    });

    test('should ignore empty lines', () => {
        const content = `API_KEY=abc123

DATABASE_URL=postgres://localhost:5432/db

PORT=3000`;

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db',
            PORT: '3000'
        });
    });

    test('should handle double-quoted values', () => {
        const content = `
API_KEY="abc123"
MESSAGE="Hello, World!"
COMPLEX_VALUE="value with spaces and symbols!@#"
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            MESSAGE: 'Hello, World!',
            COMPLEX_VALUE: 'value with spaces and symbols!@#'
        });
    });

    test('should handle single-quoted values', () => {
        const content = `
API_KEY='abc123'
MESSAGE='Hello, World!'
COMPLEX_VALUE='value with spaces and symbols!@#'
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            MESSAGE: 'Hello, World!',
            COMPLEX_VALUE: 'value with spaces and symbols!@#'
        });
    });

    test('should handle mixed quote types', () => {
        const content = `
API_KEY="abc123"
MESSAGE='Hello, World!'
UNQUOTED_VALUE=simple
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            MESSAGE: 'Hello, World!',
            UNQUOTED_VALUE: 'simple'
        });
    });

    test('should trim whitespace around keys and values', () => {
        const content = `
  API_KEY  =  abc123  
  DATABASE_URL=  postgres://localhost:5432/db  
   PORT   =   3000   
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db',
            PORT: '3000'
        });
    });

    test('should handle empty values', () => {
        const content = `
API_KEY=
DATABASE_URL=postgres://localhost:5432/db
EMPTY_VALUE=""
EMPTY_SINGLE=''
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: '',
            DATABASE_URL: 'postgres://localhost:5432/db',
            EMPTY_VALUE: '',
            EMPTY_SINGLE: ''
        });
    });

    test('should skip malformed lines without equals sign', () => {
        const content = `
API_KEY=abc123
MALFORMED_LINE_WITHOUT_EQUALS
DATABASE_URL=postgres://localhost:5432/db
ANOTHER_BAD_LINE
PORT=3000
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db',
            PORT: '3000'
        });
    });

    test('should skip lines with empty keys', () => {
        const content = `
API_KEY=abc123
=empty_key_value
 =another_empty_key
DATABASE_URL=postgres://localhost:5432/db
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db'
        });
    });

    test('should handle values containing equals signs', () => {
        const content = `
API_KEY=abc123
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
COMPLEX_URL=https://example.com?param1=value1&param2=value2
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            JWT_SECRET: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            COMPLEX_URL: 'https://example.com?param1=value1&param2=value2'
        });
    });

    test('should handle mixed scenarios', () => {
        const content = `
# Development environment variables
API_KEY=abc123
DATABASE_URL="postgres://localhost:5432/db"

# Server configuration
PORT=3000
HOST='localhost'

# This line is malformed
INVALID_LINE_NO_EQUALS

# Empty values
EMPTY_VAR=
QUOTED_EMPTY=""

# Complex values
JWT_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
URL_WITH_PARAMS=https://api.example.com/v1?key=value&other=param

# Skip empty key
=invalid_empty_key

  PADDED_KEY  =  padded_value  
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            API_KEY: 'abc123',
            DATABASE_URL: 'postgres://localhost:5432/db',
            PORT: '3000',
            HOST: 'localhost',
            EMPTY_VAR: '',
            QUOTED_EMPTY: '',
            JWT_SECRET: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            URL_WITH_PARAMS: 'https://api.example.com/v1?key=value&other=param',
            PADDED_KEY: 'padded_value'
        });
    });

    test('should handle empty input', () => {
        const result = parseEnvContent('');
        expect(result).toEqual({});
    });

    test('should handle input with only comments and empty lines', () => {
        const content = `
# This is a comment
# Another comment

# Yet another comment
        `.trim();

        const result = parseEnvContent(content);
        expect(result).toEqual({});
    });

    test('should handle values with quotes that do not match', () => {
        const content = `
MISMATCHED_QUOTES_1="value'
MISMATCHED_QUOTES_2='value"
PARTIAL_QUOTE_START="value
PARTIAL_QUOTE_END=value"
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            MISMATCHED_QUOTES_1: '"value\'',
            MISMATCHED_QUOTES_2: '\'value"',
            PARTIAL_QUOTE_START: '"value',
            PARTIAL_QUOTE_END: 'value"'
        });
    });

    test('should handle special characters in values', () => {
        const content = `
SPECIAL_CHARS=!@#$%^&*()
UNICODE_VALUE=héllo wörld 🌍
JSON_VALUE='{"key": "value", "number": 123}'
        `.trim();

        const result = parseEnvContent(content);

        expect(result).toEqual({
            SPECIAL_CHARS: '!@#$%^&*()',
            UNICODE_VALUE: 'héllo wörld 🌍',
            JSON_VALUE: '{"key": "value", "number": 123}'
        });
    });
});
