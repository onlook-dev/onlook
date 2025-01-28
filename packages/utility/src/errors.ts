export type ErrorType = 'NEXT_BUILD_ERROR' | 'REACT_ERROR' | 'UNKNOWN';

export interface ParsedError {
    type: ErrorType;
    message: string;
    filePath?: string;
    line?: number;
    column?: number;
    fullMessage: string;
}

export function compareErrors(a: ParsedError, b: ParsedError): boolean {
    if (a.type === b.type && a.type === 'REACT_ERROR' && a.message === b.message) {
        return true;
    }
    return (
        a.message === b.message &&
        a.filePath === b.filePath &&
        a.line === b.line &&
        a.column === b.column
    );
}

export function parseReactError(errorString: string, sourceId: string): ParsedError {
    if (!errorString) {
        return {
            type: 'UNKNOWN',
            message: '',
            fullMessage: '',
        };
    }

    // Check for Next.js/SWC build error pattern
    const swcMatch = errorString.match(/Error:\s+x\s+(.*?)\s+,-\[(.*?)\]\s+/);
    if (swcMatch) {
        const [filePath, line, column] = swcMatch[2]?.split(':') || [];
        return {
            type: 'NEXT_BUILD_ERROR',
            message: swcMatch[1]?.trim() || 'Unknown build error',
            filePath,
            line: line ? parseInt(line, 10) : undefined,
            column: column ? parseInt(column, 10) : undefined,
            fullMessage: errorString,
        };
    }

    // Check for Next.js webpack build error
    const webpackMatch = errorString.match(
        /ModuleBuildError: Module build failed.*?Error:\s+x\s+(.*?)\s+,-\[(.*?)\]\s+/s,
    );
    if (webpackMatch) {
        const [filePath, line, column] = webpackMatch[2]?.split(':') || [];
        return {
            type: 'NEXT_BUILD_ERROR',
            message: webpackMatch[1]?.trim() || 'Unknown webpack build error',
            filePath,
            line: line ? parseInt(line, 10) : undefined,
            column: column ? parseInt(column, 10) : undefined,
            fullMessage: errorString,
        };
    }

    // Check for file path at the start (e.g., "./app/page.tsx:10:5")
    const filePathMatch = errorString.match(/^\.\/(.+?\.tsx?):(\d+):(\d+)/);
    if (filePathMatch) {
        const [_, filePath, line, column] = filePathMatch;
        const lines = errorString.split('\n');
        const errorMessage = lines[1]?.trim();

        return {
            type: 'REACT_ERROR',
            message: errorMessage || 'Unknown error',
            filePath,
            line: line ? parseInt(line, 10) : undefined,
            column: column ? parseInt(column, 10) : undefined,
            fullMessage: errorString,
        };
    }

    // Check for React runtime error stack trace
    const runtimeMatch = errorString.match(/(?:Error|TypeError):\s*(.*?)\n\s+at\s+/);
    if (runtimeMatch) {
        const stackLines = errorString.split('\n');
        const fileMatch = stackLines.find((line) =>
            line.match(/\s+at\s+.*?\((.*?\.(?:tsx?|jsx?)):(\d+):(\d+)\)/),
        );
        const locationMatch = fileMatch?.match(/\((.*?\.(?:tsx?|jsx?)):(\d+):(\d+)\)/);
        const [_, filePath, line, column] = locationMatch || [];

        return {
            type: 'REACT_ERROR',
            message: runtimeMatch[1]?.trim() || 'Unknown runtime error',
            filePath,
            line: line ? parseInt(line, 10) : undefined,
            column: column ? parseInt(column, 10) : undefined,
            fullMessage: errorString,
        };
    }

    // Check for simple runtime errors with sourceId fallback
    const simpleErrorMatch = errorString.match(
        /(?:Uncaught\s+)?(?:Error|ReferenceError|TypeError):\s*(.*?)$/,
    );
    if (simpleErrorMatch && sourceId) {
        // Extract file path from sourceId (webpack-internal or other formats)
        const filePath = parseWebpackSourceId(sourceId);
        return {
            type: 'REACT_ERROR',
            message: simpleErrorMatch[1]?.trim() || 'Unknown runtime error',
            filePath: filePath || undefined,
            fullMessage: errorString,
        };
    }

    // Return unknown if no patterns match
    return {
        type: 'UNKNOWN',
        message: errorString,
        fullMessage: errorString,
    };
}

function parseWebpackSourceId(sourceId: string): string {
    // Remove the webpack-internal:/// prefix first
    let path = sourceId.replace('webpack-internal:///', '');

    // Next.js patterns
    if (path.startsWith('(app-pages-browser)/./')) {
        return path.replace('(app-pages-browser)/./', '');
    }
    if (path.startsWith('(rsc)/./')) {
        return path.replace('(rsc)/./', ''); // React Server Components
    }
    if (path.startsWith('(sc_server)/./')) {
        return path.replace('(sc_server)/./', ''); // Server Components
    }
    if (path.startsWith('(sc_client)/./')) {
        return path.replace('(sc_client)/./', ''); // Client Components
    }
    if (path.startsWith('(middleware)/./')) {
        return path.replace('(middleware)/./', '');
    }

    // Create React App patterns
    if (path.startsWith('./src/')) {
        return path;
    }
    if (path.startsWith('./node_modules/')) {
        return path;
    }

    // Vite patterns
    if (path.startsWith('/@fs/')) {
        return path.replace('/@fs/', '');
    }
    if (path.startsWith('/@vite/')) {
        return path.replace('/@vite/', '');
    }

    // webpack-dev-server patterns
    if (path.startsWith('webpack:///')) {
        return path.replace('webpack:///', '');
    }

    // Nested module patterns
    if (path.match(/^\([^)]+\)\/?\.\//)) {
        return path.replace(/^\([^)]+\)\/?\.\//, '');
    }

    // Absolute paths (common in production builds)
    if (path.startsWith('/')) {
        return path;
    }

    // Default case - return as is if no patterns match
    return path;
}
