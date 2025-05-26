export interface ParsedError {
    sourceId: string;
    type: 'frame' | 'terminal';
    content: string;
}

export function compareErrors(a: ParsedError, b: ParsedError): boolean {
    if (a.sourceId === b.sourceId && a.content === b.content) {
        return true;
    }
    return false;
}

export function checkMessageError(data: string) {
    // Critical CLI errors
    const errorPatterns = [
        'command not found',
        'ENOENT:',
        'fatal:',
        'error:',

        // Critical Node.js errors
        'TypeError:',
        'ReferenceError:',
        'SyntaxError:',
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

export function checkMessageSuccess(data: string): boolean {
    // Strip ANSI escape codes to get plain text
    const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

    const plainText = stripAnsi(data).trim().toLowerCase();
    const successPatterns = ['get / 200'];

    if (successPatterns.some((pattern) => plainText.includes(pattern))) {
        return true;
    }
    return false;
}
