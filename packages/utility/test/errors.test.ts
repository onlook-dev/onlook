import { describe, expect, it } from 'bun:test';
import { isErrorMessage, isSuccessMessage, TerminalBuffer } from '../src/errors';

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
            expect(isErrorMessage(msg)).toBe(true);
        });
    }

    it('should not detect error for a normal log', () => {
        expect(isErrorMessage('Server started successfully')).toBe(false);
    });
});

describe('checkMessageSuccess', () => {
    it('should detect success for GET / 200', () => {
        expect(isSuccessMessage('GET / 200')).toBe(true);
        expect(isSuccessMessage('\x1B[32mGET / 200\x1B[0m')).toBe(true); // with ANSI
    });

    it('should not detect success for unrelated message', () => {
        expect(isSuccessMessage('Build failed')).toBe(false);
        expect(isSuccessMessage('Some random log')).toBe(false);
    });
});

describe('TerminalBuffer', () => {
    it('should emit error when an error message is added', (done) => {
        const buffer = new TerminalBuffer(5);
        buffer.onError((lines) => {
            expect(lines.some(isErrorMessage)).toBe(true);
            done();
        });
        buffer.addLine('This is fine');
        buffer.addLine('Build failed.'); // triggers error
    });

    it('should emit success and clear buffer when a success message is added', (done) => {
        const buffer = new TerminalBuffer(5);
        buffer.onSuccess(() => {
            expect(buffer.getBuffer().length).toBe(0);
            done();
        });
        buffer.addLine('Some log');
        buffer.addLine('GET / 200'); // triggers success
    });

    it('should only keep the last N lines', () => {
        const buffer = new TerminalBuffer(3);
        buffer.addLine('line1');
        buffer.addLine('line2');
        buffer.addLine('line3');
        buffer.addLine('line4');
        expect(buffer.getBuffer()).toEqual(['line2', 'line3', 'line4']);
    });

    it('should allow clearing the buffer manually', () => {
        const buffer = new TerminalBuffer(3);
        buffer.addLine('line1');
        buffer.addLine('line2');
        buffer.clear();
        expect(buffer.getBuffer()).toEqual([]);
    });

    it('should not emit error for normal logs', (done) => {
        const buffer = new TerminalBuffer(3);
        let errorEmitted = false;
        buffer.onError(() => {
            errorEmitted = true;
        });
        buffer.addLine('normal log');
        buffer.addLine('another log');
        setTimeout(() => {
            expect(errorEmitted).toBe(false);
            done();
        }, 10);
    });
});
