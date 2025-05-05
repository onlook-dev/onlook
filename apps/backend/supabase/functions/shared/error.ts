export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}

export function createErrorObject(error: unknown): {
    error: {
        message: string;
    };
} {
    return {
        error: {
            message: error instanceof Error ? error.message : JSON.stringify(error),
        },
    };
}