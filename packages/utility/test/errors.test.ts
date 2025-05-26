import { describe, expect, it } from 'bun:test';
import { checkMessageError, checkMessageSuccess } from '../src/errors';

// Known React/Next.js error messages
const reactNextErrors = [
    'Failed to compile.',
    'Build failed.',
    'Invalid hook call. Hooks can only be called inside of the body of a function component.',
    'Invalid configuration: The `output` property is not allowed in your Next.js config.',
    'error: Something went wrong in the build process.',
    'fatal: Unexpected error occurred.',
    'TypeError: Cannot read property',
    'ReferenceError: foo is not defined',
    'SyntaxError: Unexpected token',
    'Cannot find module "react"',
    'Module not found: Can\'t resolve "next"',
    'npm ERR! missing script: start',
    'yarn error Command failed.',
    'pnpm ERR! Cannot find module',
    'Missing dependencies: react, react-dom',
    'TS2304: Cannot find name',
    'TS2307: Cannot find module',
];

describe('checkMessageError', () => {
    for (const msg of reactNextErrors) {
        it(`should detect error for: ${msg.slice(0, 40)}...`, () => {
            expect(checkMessageError(msg)).toBe(true);
        });
    }

    it('should not detect error for a normal log', () => {
        expect(checkMessageError('Server started successfully')).toBe(false);
    });
});

describe('checkMessageSuccess', () => {
    it('should detect success for GET / 200', () => {
        expect(checkMessageSuccess('GET / 200')).toBe(true);
        expect(checkMessageSuccess('\x1B[32mGET / 200\x1B[0m')).toBe(true); // with ANSI
    });

    it('should not detect success for unrelated message', () => {
        expect(checkMessageSuccess('Build failed')).toBe(false);
        expect(checkMessageSuccess('Some random log')).toBe(false);
    });
});
