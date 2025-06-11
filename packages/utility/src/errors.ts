import stripAnsi from 'strip-ansi';

export interface ParsedError {
    sourceId: string;
    type: 'frame' | 'terminal' | 'apply-code';
    content: string;
}

export function compareErrors(a: ParsedError, b: ParsedError): boolean {
    if (a.sourceId === b.sourceId && a.content === b.content) {
        return true;
    }
    return false;
}

export function shouldIgnoreMessage(message: string) {
    if (message.startsWith('<w>')) {
        return true;
    }
    return false;
}

export function isErrorMessage(data: string) {
    // Critical CLI errors
    const errorPatterns = [
        // Next.js errors
        'Syntax Error',
        'Reference Error',
        'Type Error',

        'command not found',
        'ENOENT:',
        'fatal:',
        'error:',

        // Critical Node.js errors
        'TypeError',
        'ReferenceError',
        'SyntaxError',
        'Cannot find module',
        'Module not found',

        // Critical React/Next.js errors
        'Failed to compile',
        'Build failed',
        'Invalid hook call',
        'Invalid configuration',

        // Critical Package errors
        'npm ERR!',
        'yarn error',
        'pnpm ERR!',
        'Missing dependencies',

        // Critical TypeScript errors
        'TS2304:', // Cannot find name
        'TS2307:', // Cannot find module
    ];

    let errorFound = false;
    if (errorPatterns.some((pattern) => data.toLowerCase().includes(pattern.toLowerCase()))) {
        errorFound = true;
    }
    return errorFound;
}

export function isSuccessMessage(data: string): boolean {
    const successPatterns = ['get / 200'];

    if (successPatterns.some((pattern) => data.toLowerCase().includes(pattern.toLowerCase()))) {
        return true;
    }
    return false;
}

// Stateful buffer for terminal output
export class TerminalBuffer {
    private buffer: string[] = [];
    private readonly maxLines: number;
    private errorCallback?: (errorLines: string[]) => void;
    private successCallback?: () => void;

    constructor(maxLines: number = 20) {
        this.maxLines = maxLines;
    }

    /**
     * Register a callback to be called when an error is detected.
     */
    onError(callback: (errorLines: string[]) => void) {
        this.errorCallback = callback;
    }

    /**
     * Register a callback to be called when a success is detected (buffer is cleared).
     */
    onSuccess(callback: () => void) {
        this.successCallback = callback;
    }

    /**
     * Add a new line to the buffer and process for errors/success.
     */
    addLine(line: string) {
        const rawMessage = stripAnsi(line);

        this.buffer.push(rawMessage);
        if (this.buffer.length > this.maxLines) {
            this.buffer.shift();
        }
        // Check for error in the buffer
        if (this.buffer.some(isErrorMessage)) {
            if (this.errorCallback) {
                this.errorCallback([...this.buffer]);
            }
        }
        // Check for success in the buffer
        if (this.buffer.some(isSuccessMessage)) {
            this.clear();
            if (this.successCallback) {
                this.successCallback();
            }
        }
    }

    /**
     * Clear the buffer.
     */
    clear() {
        this.buffer = [];
    }

    /**
     * Get the current buffer contents.
     */
    getBuffer() {
        return [...this.buffer];
    }
}
