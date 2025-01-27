type ErrorType = 'NEXT_BUILD_ERROR' | 'REACT_ERROR' | 'UNKNOWN';

interface ParsedError {
    type: ErrorType;
    message: string;
    filePath?: string;
}

export function parseReactError(errorString: string): ParsedError {
    // Check for Next.js/SWC build error pattern
    const swcMatch = errorString.match(/Error:\s+x\s+(.*?)\s+,-\[(.*?)\]\s+/);
    if (swcMatch) {
        const filePath = swcMatch[2]?.split(':')[0];
        return {
            type: 'NEXT_BUILD_ERROR',
            message: swcMatch[1]?.trim() || 'Unknown build error',
            filePath,
        };
    }

    // Check for Next.js webpack build error
    const webpackMatch = errorString.match(
        /ModuleBuildError: Module build failed.*?Error:\s+x\s+(.*?)\s+,-\[(.*?)\]\s+/s,
    );
    if (webpackMatch) {
        const filePath = webpackMatch[2]?.split(':')[0];
        return {
            type: 'NEXT_BUILD_ERROR',
            message: webpackMatch[1]?.trim() || 'Unknown webpack build error',
            filePath,
        };
    }

    // Check for file path at the start (e.g., "./app/page.tsx")
    const filePathMatch = errorString.match(/^\.?\/(.*?\.tsx?):/);
    if (filePathMatch) {
        const filePath = filePathMatch[1];
        const lines = errorString.split('\n');
        const errorLine = lines.find((line) => line.match(/^\s*\d+\s*\|/));
        if (errorLine) {
            return {
                type: 'REACT_ERROR',
                message: errorLine.replace(/^\s*\d+\s*\|/, '').trim(),
                filePath,
            };
        }
    }

    // Check for React runtime error stack trace
    const runtimeMatch = errorString.match(/(?:Error|TypeError):\s*(.*?)\n\s+at\s+/);
    if (runtimeMatch) {
        const stackLines = errorString.split('\n');
        const fileMatch = stackLines.find((line) =>
            line.match(/\s+at\s+.*?\((.*?\.(?:tsx?|jsx?)):(\d+):(\d+)\)/),
        );
        const filePath = fileMatch?.match(/\((.*?\.(?:tsx?|jsx?)):/)?.[1];

        return {
            type: 'REACT_ERROR',
            message: runtimeMatch[1]?.trim() || 'Unknown runtime error',
            filePath,
        };
    }

    // Return unknown if no patterns match
    return {
        type: 'UNKNOWN',
        message: errorString,
    };
}
