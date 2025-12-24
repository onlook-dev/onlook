export function errorHandler(error: unknown) {
    try {
        console.error('Error in chat', error);
        if (!error) {
            return 'unknown error';
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error instanceof Error) {
            return error.message;
        }
        return JSON.stringify(error);
    } catch (error) {
        console.error('Error in errorHandler', error);
        return 'unknown error';
    }
}
